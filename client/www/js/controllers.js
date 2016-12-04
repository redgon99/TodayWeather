
angular.module('starter.controllers', [])
    .controller('ForecastCtrl', function ($scope, $rootScope, $ionicPlatform, $ionicScrollDelegate,
                                          $ionicNavBarDelegate, $q, $http, $timeout, WeatherInfo, WeatherUtil, Util,
                                          Purchase, $stateParams, $location, $ionicHistory, $sce, $ionicLoading,
                                          $ionicPopup, $translate) {
        var TABLET_WIDTH = 720;
        var ASPECT_RATIO_16_9 = 1.7;
        var bodyWidth;
        var bodyHeight;
        var colWidth;
        var cityData = null;

        $scope.showDetailWeather = false;
        if ($location.path() === '/tab/dailyforecast') {
            $scope.forecastType = "mid"; //mid, detail(aqi)
        }
        else {
            $scope.forecastType = "short"; //mid, detail(aqi)
        }

        var shortenAddress = "";

        $scope.imgPath = Util.imgPath;

        if ($scope.forecastType == 'mid') {
            $scope.dayToString = function(day) {
                var dayStr = ['LOC_SUN', 'LOC_MON', 'LOC_TUE', 'LOC_WED', 'LOC_THU', 'LOC_FRI', 'LOC_SAT'];
                return dayStr[day];
            };

            $scope.dayToFullString = function(day) {
                var dayFullStr = ['LOC_SUNDAY', 'LOC_MONDAY', 'LOC_TUESDAY', 'LOC_WEDNESDAY', 'LOC_THURSDAY',
                    'LOC_FRIDAY', 'LOC_SATURDAY'];
                return dayFullStr[day];
            };
        }

        $scope.getDayString = function (day) {
            var dayFromTodayStr =['LOC_A_COUPLE_OF_DAYS_AGO', 'LOC_THE_DAY_BEFORE_YESTERDAY', 'LOC_YESTERDAY',
                'LOC_TODAY', 'LOC_TOMORROW', 'LOC_THE_DAY_AFTER_TOMORROW', 'LOC_TWO_DAYS_AFTER_TOMORROW',
                'LOC_FROM_TODAY'];
            if (-3 <= day && day <= 3) {
                return dayFromTodayStr[day + 3];
            }
            else {
                //이 케이스 아직 없음.
                return dayFromTodayStr[dayFromTodayStr.length-1];
            }
            console.error("Fail to get day string day=" + day);
            return "";
        };

        $scope.getSentimentIcon = function (grade) {
           switch (grade) {
               case 1:
                   return 'ic_sentiment_satisfied_white_24px.svg';
               case 2:
                   return 'ic_sentiment_neutral_white_24px.svg';
               case 3:
                   return 'ic_sentiment_dissatisfied_white_24px.svg';
               case 4:
                   return 'ic_sentiment_very_dissatisfied_white_24px.svg';
               case 5:
                   return 'ic_sentiment_very_dissatisfied_white_24px.svg';
               default:
                   console.log('Fail to find grade='+grade);
           }
            return 'ic_sentiment_very_dissatisfied_white_24px.svg';
        };

        $scope.getSentimentStr = function(grade) {
            var airGradeStr = ['LOC_GOOD', 'LOC_MODERATE', 'LOC_UNHEALTHY_FOR_SENSITIVE_GROUPS', 'LOC_UNHEALTHY', 'LOC_VERY_UNHEALTHY', 'LOC_HAZARDOUS'];
            if (grade >= 3) {
                grade++;
            }
            return airGradeStr[grade-1];
        };

        $scope.getLowHighGradeStr = function (grade) {
           var lowHighGradeStr = ['LOC_LOW', 'LOC_NORMAL', 'LOC_HIGH', 'LOC_VERY_HIGH', 'LOC_HAZARD'];
            return lowHighGradeStr[grade];
        };

        $scope.getAttentionWarningGradeStr = function (grade) {
            var awGradeStr = ['LOC_ATTENTION', 'LOC_CAUTION', 'LOC_WARNING', 'LOC_HAZARD'];
            return awGradeStr[grade];
        };

        $scope.getWeatherStr = function (current) {
            if (current.weatherType == undefined || Util.language == 'ko') {
                if (!(current.weather == undefined)) {
                    return current.weather;
                }
                return "";
            }

            var weatherTypeStr = ['LOC_CLEAR', 'LOC_PARTLY_CLOUDY', 'LOC_MOSTLY_CLOUDY', 'LOC_CLOUDY', 'LOC_MIST',
                'LOC_HAZE', 'LOC_FOG', 'LOC_THIN_FOG', 'LOC_DENSE_FOG', 'LOC_FOG_STOPPED',

                'LOC_FOG', 'LOC_PARTLY_FOG', 'LOC_YELLOW_DUST', 'LOC_RAIN', 'LOC_LIGHT_DRIZZLE',
                'LOC_DRIZZLE', 'LOC_HEAVY_DRIZZLE', 'LOC_DRIZZLE_STOPPED', 'LOC_LIGHT_RAIN_AT_TIMES', 'LOC_LIGHT_RAIN',

                'LOC_RAIN_AT_TIMES', 'LOC_RAIN', 'LOC_HEAVY_RAIN_AT_TIMES', 'LOC_HEAVY_RAIN', 'LOC_LIGHT_SHOWERS',
                'LOC_SHOWERS', 'LOC_HEAVY_SHOWERS', 'LOC_SHOWERS_STOPPED', 'LOC_RAIN_STOPPED', 'LOC_LIGHT_SLEET',

                'LOC_HEAVY_SLEET', 'LOC_SLEET_STOPPED', 'LOC_LIGHT_SNOW_AT_TIMES', 'LOC_LIGHT_SNOW', 'LOC_SNOW_AT_TIMES',
                'LOC_SNOW', 'LOC_HEAVY_SNOW_AT_TIMES', 'LOC_HEAVY_SNOW', 'LOC_LIGHT_SNOW_SHOWERS', 'LOC_HEAVY_SNOW_SHOWERS',

                'LOC_SNOW_SHOWERS_STOPPED', 'LOC_SNOW_STOPPED', 'LOC_LIGHT_SNOW_PELLETS', 'LOC_HEAVY_SNOW_PELLETS', 'LOC_LIGHT_SNOW_STORM',
                'LOC_SNOW_STORM', 'LOC_HEAVY_SNOW_STORM', 'LOC_POWDER_SNOW', 'LOC_WATER_SPOUT', 'LOC_HAIL',

                'LOC_THUNDERSHOWERS', 'LOC_THUNDERSHOWERS_HAIL', 'LOC_THUNDERSHOWERS_RAIN_SNOW', 'LOC_THUNDERSHOWERS_STOPPED_RAIN', 'LOC_THUNDERSHOWERS_STOPPED_SNOW',
                'LOC_LIGHTNING', 'LOC_BOLT_FROM_THE_BLUE', 'LOC_BOLT_STOPPED'];
            return weatherTypeStr[current.weatherType];
        };

        var regionSize;
        var regionSumSize;
        var bigDigitSize;
        //var bigTempPointSize;
        var bigSkyStateSize;
        //var smallTimeSize;
        var smallImageSize;
        //var smallDigitSize;
        var headerRatio = 0.4;
        var contentRatio = 0.6;
        var showAqi = false;

        /* The height of a toolbar by default in Angular Material */
        var legacyToolbarH = 58;
        var startHeight;
        var headerE;
        var picture;
        var alphaBar;
        var pBigDigit;
        var imgBigSkyStateSize;

        var strError = "Error";
        var strAddLocation = "Add locations";
        var strClose = "Close";
        var strRetry = "Retry";
        var strFailToGetAddressInfo = "Fail to get location information";
        var strFailToGetCurrentPosition = "Fail to find your current location";
        var strFailToGetWeatherInfo = "Fail to get weather info.";
        var strPleaseTurnOnLocationWiFi = "Please turn on location and Wi-FI";
        $scope.strHour = "h";

        $translate(['LOC_ERROR', 'LOC_ADD_LOCATIONS', 'LOC_HOUR', 'LOC_CLOSE', 'LOC_RETRY',
            'LOC_FAIL_TO_GET_LOCATION_INFORMATION', 'LOC_FAIL_TO_FIND_YOUR_CURRENT_LOCATION',
            'LOC_FAIL_TO_GET_WEATHER_INFO', 'LOC_PLEASE_TURN_ON_LOCATION_AND_WIFI']).then(function (translations) {
            strError = translations.LOC_ERROR;
            strAddLocation = translations.LOC_ADD_LOCATIONS;
            strClose = translations.LOC_CLOSE;
            strRetry = translations.LOC_RETRY;
            strFailToGetAddressInfo = translations.LOC_FAIL_TO_GET_LOCATION_INFORMATION;
            strFailToGetCurrentPosition = translations.LOC_FAIL_TO_FIND_YOUR_CURRENT_LOCATION;
            strFailToGetWeatherInfo = translations.LOC_FAIL_TO_GET_WEATHER_INFO;
            strPleaseTurnOnLocationWiFi = translations.LOC_PLEASE_TURN_ON_LOCATION_AND_WIFI;
            $scope.strHour = translations.LOC_HOUR;
        }, function (translationIds) {
            console.log("Fail to translate : " + JSON.stringify(translationIds));
        });

        function init() {
            //identifyUser();
            $ionicHistory.clearHistory();

            if (window.screen.height) {
                bodyHeight = window.screen.height;
                bodyWidth = window.screen.width;
            }
            else if (window.innerHeight) {
                //crosswalk에서 늦게 올라옴.
                bodyHeight = window.innerHeight;
                bodyWidth = window.innerWidth;
            }
            else if (window.outerHeight) {
                //ios에서는 outer가 없음.
                bodyHeight = window.outerHeight;
                bodyWidth = window.outerWidth;
            }
            else {
                console.log("Fail to get window width, height");
                bodyHeight = 640;
                bodyWidth = 360;
            }

            colWidth = bodyWidth/7;
            if (colWidth > 60) {
                colWidth = 60;
            }
            $scope.colWidth = colWidth;

            if (bodyWidth >= TABLET_WIDTH && bodyWidth < bodyHeight) {
                headerRatio = 0.4;
                contentRatio = 0.6;
            }
            else if (bodyHeight >= 730) {
                //note5, nexus5x, iphone 5+
                if (ionic.Platform.isIOS()) {
                    headerRatio = 0.40;
                    contentRatio = 0.60;
                }
                else {
                    headerRatio = 0.33;
                    contentRatio = 0.67;
                }
            }
            else {
                if (ionic.Platform.isIOS()) {
                    headerRatio = 0.33;
                    contentRatio = 0.67;
                }
                else {
                    //0.32는 되어야, top main box가 16:9비율이 나옴.
                    //차후 top main box에 사진 들어가는 것을 고려.
                    headerRatio = 0.32;
                    contentRatio = 0.68;
                }
            }

            /* The height of a toolbar by default in Angular Material */
            legacyToolbarH = 58;
            startHeight = bodyHeight * headerRatio;
            headerE         = angular.element(document.querySelector('[md-page-header]'));
            picture        = angular.element(document.querySelector('[md-header-picture]'));
            alphaBar        = angular.element(document.getElementById('alphaBar'));

            //console.log(headerE);
            //console.log(picture);
            //console.log("startHeight=", startHeight);

            headerE.css('height', startHeight+'px');
            picture.css('height', startHeight+'px');
            //빠르게 변경될때, header가 disable-user-behavior class가 추가되면서 화면이 올라가는 문제
            $scope.headerHeight = startHeight;

            var padding = 1;
            var smallPadding = 1;

            //iphone 4 480-20(status bar)
            if ((bodyHeight === 460 || bodyHeight === 480) && bodyWidth === 320) {
                padding = 1.125;
                smallPadding = 1.1;
            }
            //iphone 5 568-20(status bar)
            if ((bodyHeight === 548 || bodyHeight === 568) && bodyWidth === 320) {
                smallPadding = 1.1;
            }

            if (bodyHeight >= 640) {
                //대부분의 android와 iPhone6부터 aqi보여줌.
                showAqi = true;
            }
            else if (Purchase.accountLevel != Purchase.ACCOUNT_LEVEL_FREE
                && bodyHeight / bodyWidth >= ASPECT_RATIO_16_9) {
                //free이상의 유저이며, 16:9 이상 비율은 aqi보여줌.
                showAqi = true;
            }

            var mainHeight = bodyHeight - 100;

            //var topTimeSize = mainHeight * 0.026;
            //$scope.topTimeSize = topTimeSize<16.8?topTimeSize:16.8;

            regionSize = mainHeight * 0.0306 * padding; //0.051
            regionSize = regionSize<33.04?regionSize:33.04;
            $scope.regionSize = regionSize;

            regionSumSize = mainHeight * 0.0336 * padding; //0.047
            regionSumSize = regionSumSize<30.45?regionSumSize:30.45;
            $scope.regionSumSize = regionSumSize;

            bigDigitSize = mainHeight * 0.16544 * padding; //0.2193
            bigDigitSize = bigDigitSize<142.1?bigDigitSize:142.1;
            $scope.bigDigitSize = bigDigitSize;

            //bigTempPointSize = mainHeight * 0.03384 * padding; //0.0423
            //bigTempPointSize = bigTempPointSize<27.4?bigTempPointSize:27.4;

            bigSkyStateSize = mainHeight * 0.11264 * padding; //0.1408
            bigSkyStateSize = bigSkyStateSize<91.2?bigSkyStateSize:91.2;
            $scope.bigSkyStateSize = bigSkyStateSize;

            //smallTimeSize = mainHeight * 0.0299 * smallPadding;
            //smallTimeSize = smallTimeSize<19.37?smallTimeSize:19.37;

            smallImageSize = mainHeight * 0.0512 * smallPadding;
            smallImageSize = smallImageSize<33.17?smallImageSize:33.17;
            $scope.smallImageSize = smallImageSize;

            //smallDigitSize = mainHeight * 0.0320 * smallPadding;
            //smallDigitSize = smallDigitSize<20.73?smallDigitSize:20.73;

            var fav = parseInt($stateParams.fav);
            if (!isNaN(fav)) {
                if (fav === 0) {
                    var city = WeatherInfo.getCityOfIndex(0);
                    if (city !== null && !city.disable) {
                        WeatherInfo.setCityIndex(fav);
                    }
                } else {
                    WeatherInfo.setCityIndex(fav);
                }
            }
            if (WeatherInfo.getEnabledCityCount() === 0) {
                $scope.showAlert(strError, strAddLocation, function() {
                    $location.path('/tab/search');
                });
                return;
            }
            $scope.cityCount = WeatherInfo.getEnabledCityCount();

            applyWeatherData();
            loadWeatherData();
        }

        /**
         * 실제 강우량과, 예보 강우량을 구분하는데 all인 경우 두개 모두 표시
         * @param pty
         * @param rn1
         * @param r06
         * @param s06
         * @param all
         * @returns {string}
         * @private
         */
        function _makeRainSnowFallValueStr(pty, rn1, r06, s06, all) {
            var ret = "";
            var frcst = 0;
            var rsf = 0;

            if (r06 != undefined && r06 > 0) {
                frcst = r06>=10?Math.round(r06):r06;
            }
            else if (r06 != undefined && s06 > 0) {
                frcst = s06>=10?Math.round(s06):s06;
            }

            if (rn1 != undefined && rn1 > 0) {
                rsf = rn1>=10?Math.round(rn1):rn1;
            }

            if (rn1 != undefined && rn1 > 0) {
                if ((r06 != undefined || s06 != undefined) && all) {
                    ret += rsf+'/'+frcst;
                }
                else {
                    ret += rsf;
                }
                return ret;
            }
            else if ((r06 != undefined && r06 > 0) || (r06 != undefined && s06 > 0)) {
                if (rn1 != undefined && all) {
                    ret += rsf+'/'+frcst;
                }
                else {
                    ret += frcst;
                }
                return ret;
            }
            if (pty > 0) {
               ret = "0";
            }
            return ret;
        }

        /**
         * 적설량과, 강우량 구분
         * @param pty
         * @param rn1
         * @param r06
         * @param s06
         * @returns {*}
         * @private
         */
        function _makeRainSnowFallSymbol(pty, rn1, r06, s06) {
            if (pty != undefined && pty === 3) {
                return "cm";
            }
            else if (pty != undefined && pty > 0) {
                return "mm";
            }

            if (r06 != undefined && r06 > 0) {
                return "mm";
            }
            if (s06 != undefined && s06 > 0) {
                return "cm";
            }

            if (rn1 != undefined && rn1 > 0) {
                return "mm";
            }
            return "";
        }

        /**
         * pty가 0이라도 예보상으로 비가 온다고 했거나, 비가 오지 않는다고 했지만 실제로 비가 온 경우도 있음.
         * @param day
         * @returns {boolean}
         */
        $scope.haveRainSnowFall = function (day) {
            return !!((day.pty != undefined && day.pty > 0) ||
            (day.rn1 != undefined && day.rn1 > 0) ||
            (day.r06 != undefined && day.r06 > 0) ||
            (day.s06 != undefined && day.s06 > 0));
        };

        $scope.getRainSnowFall = function (value) {
            var ret = _makeRainSnowFallValueStr(value.pty, value.rn1, value.r06, value.s06);
            if (ret == "") {
                ret = "0";
            }
            return ret;
        };

        $scope.getRainSnowFallSymbol = function (value) {
            var ret = _makeRainSnowFallSymbol(value.pty, value.rn1, value.r06, value.s06);
            if (ret == "") {
                ret = "mm";
            }
            return ret;
        };

        /**
         * display item을 count하여 table pixel을 구함.
         * 0.9.1까지 displayItemCount가 없음.
         * @param displayItemCount
         * @returns {number}
         */
        function getShortTableHeight(displayItemCount) {
            var val = 0;
            if (displayItemCount >= 1) {
                //sky
                val += $scope.smallImageSize;
            }
            if (displayItemCount >= 2) {
                //pop body1
                val += 15;
            }
            if (displayItemCount >= 3) {
                //rn1 - caption
                val += 13;
            }
            return val;
        }

        $scope.getShortTableHeight = getShortTableHeight;

        /**
         * display item을 count하여 table pixel을 구함.
         * @param displayItemCount
         * @returns {number}
         */
        function getMidTableHeight(displayItemCount) {
            var val = 17; //day  - subheading
            if (displayItemCount == undefined || displayItemCount == 0) {
                displayItemCount = 7;
            }
            //최소한 한개의 이미지는 존재함.
            val += $scope.smallImageSize*0.8;

            if (displayItemCount & 4) {
                val += $scope.smallImageSize*0.8;
            }
            else {
                val += $scope.smallImageSize*0.8/2;
            }
            if (displayItemCount & 2) {
                //pop - body1
                val += 15;
            }
            if (displayItemCount & 1) {
                //rns - caption
                val += 13;
            }
            return val;
        }

        $scope.getMidTableHeight = getMidTableHeight;

        function applyWeatherData() {
            console.log('apply weather data');
            cityData = WeatherInfo.getCityOfIndex(WeatherInfo.getCityIndex());
            if (cityData === null || cityData.address === null) {
                console.log("fail to getCityOfIndex");
                return;
            }

            $scope.timeWidth = colWidth * cityData.timeTable.length;
            console.log("timeWidth="+$scope.timeWidth);
            $scope.dayWidth = colWidth * cityData.dayTable.length;

            shortenAddress = WeatherUtil.getShortenAddress(cityData.address);
            $scope.address = shortenAddress;
            console.log(shortenAddress);
            $scope.currentWeather = cityData.currentWeather;

            $scope.currentPosition = cityData.currentPosition;

            $scope.updateTime = (function () {
               if (cityData.currentWeather) {
                   if (cityData.currentWeather.stnDateTime) {
                       return cityData.currentWeather.stnDateTime;
                   }
                   else {
                       var tmpDate = cityData.currentWeather.date;
                       return tmpDate.substr(0,4)+"-"+tmpDate.substr(4,2)+"-" +tmpDate.substr(6,2) +
                           " " + cityData.currentWeather.time + ":00";
                   }
               }
            })();

            // To share weather information for apple watch.
            // AppleWatch.setWeatherData(cityData);

            var mainHeight = bodyHeight * contentRatio;
            var padding = 0;

            //의미상으로 배너 여부이므로, TwAds.enabledAds가 맞지만 loading이 느려, account level로 함.
            //광고 제거 버전했을 때, AQI가 보이게 padding맞춤. 나머지 14px는 chart에서 사용됨.
            if (Purchase.accountLevel == Purchase.ACCOUNT_LEVEL_FREE) {
                padding += 36;
            }

            if (bodyHeight === 480) {
                //iphone4
                padding -= 32;
            }
            else if (ionic.Platform.isAndroid()) {
                //status bar
                padding += 24;
                if (bodyHeight <= 512) {
                    //view2 4:3
                    padding -= 32;
                }
            }

            if($scope.forecastType == 'short') {
                if (showAqi && cityData.currentWeather.arpltn) {
                    padding += 36;
                }
                var chartShortHeight = mainHeight - (143 + padding);
                $scope.chartShortHeight = chartShortHeight < 300 ? chartShortHeight : 300;
            }
            else {
                if (showAqi && cityData.dayTable.length >= 8 && cityData.dayTable[7].dustForecast) {
                    padding+=36;
                }
                var chartMidHeight = mainHeight - (136+padding);
                $scope.chartMidHeight = chartMidHeight < 300 ? chartMidHeight : 300;
            }
            /**
             * loading을 분산시켜서 탭 전환을 빠르게 보이도록 함.
             */
            setTimeout(function () {
                $scope.showDetailWeather = true;
                _diffTodayYesterday($scope.currentWeather, $scope.currentWeather.yesterday);
                _makeSummary($scope.currentWeather, $scope.currentWeather.yesterday);
                $scope.dayTable = cityData.dayTable;
                if($scope.forecastType == 'short') {
                    $scope.timeTable = cityData.timeTable;
                    $scope.timeChart = cityData.timeChart;

                    // ios에서 ionic native scroll 사용시에 화면이 제대로 안그려지는 경우가 있어서 animation 필수.
                    if (ionic.Platform.isAndroid()) {
                        $ionicScrollDelegate.$getByHandle("timeChart").scrollTo(getTodayPosition(), 0, false);
                    } else {
                        $ionicScrollDelegate.$getByHandle("timeChart").scrollTo(getTodayPosition(), 0, true);
                    }
                }
                else {
                    $scope.dayChart = cityData.dayChart;

                    if (ionic.Platform.isAndroid()) {
                        $ionicScrollDelegate.$getByHandle("weeklyChart").scrollTo(getTodayPosition(), 0, false);
                        $ionicScrollDelegate.$getByHandle("weeklyTable").scrollTo(300, 0, false);
                    } else {
                        $ionicScrollDelegate.$getByHandle("weeklyChart").scrollTo(getTodayPosition(), 0, true);
                        $ionicScrollDelegate.$getByHandle("weeklyTable").scrollTo(300, 0, true);
                    }
                }
            });
        }

        /**
         * retry popup이 없는 경우 항상 undefined여야 함.
         */
        var confirmPopup;
        function loadWeatherData() {
            if (cityData.address === null || WeatherInfo.canLoadCity(WeatherInfo.getCityIndex()) === true) {
                if (confirmPopup) {
                    confirmPopup.close();
                    confirmPopup = undefined;
                }
                $ionicLoading.show();
                updateWeatherData().then(function () {
                    $ionicLoading.hide();
                }, function (msg) {
                    $ionicLoading.hide();
                    showRetryConfirm(strError, msg, function (retry) {
                        if (retry) {
                            setTimeout(function () {
                                loadWeatherData();
                            }, 0);
                        }
                    });
                }).finally(function () {
                    console.log('finish update weather data');
                    shortenAddress = WeatherUtil.getShortenAddress(cityData.address);
                });
                return;
            }

            $ionicLoading.hide();
        }

        /**
         * android 6.0이상에서 처음 현재위치 사용시에, android 현재위치 접근에 대한 popup때문에 앱 pause->resume이 됨.
         * 그래서 init와 reloadevent가 둘다 오게 되는데 retry confirm이 두개 뜨지 않게 한개 있는 경우 닫았다가 새롭게 열게 함.
         * @param title
         * @param template
         * @param callback
         */
        function showRetryConfirm(title, template, callback) {
            if (confirmPopup) {
                confirmPopup.close();
            }
            confirmPopup = $ionicPopup.show({
                title: title,
                template: template,
                buttons: [
                    { text: strClose,
                        onTap: function () {
                            return false;
                        }
                    },
                    { text: strRetry,
                        type: 'button-positive',
                        onTap: function () {
                            return true;
                        }
                    }
                ]
            });
            confirmPopup
                .then(function (res) {
                    if (res) {
                        console.log("Retry");
                    } else {
                        console.log("Close");
                    }
                    callback(res);
                })
                .finally(function () {
                    console.log('called finally');
                    confirmPopup = undefined;
                });
        }

        function updateWeatherData() {
            var deferred = $q.defer();
            if (cityData.currentPosition === true) {
                WeatherUtil.getCurrentPosition().then(function (coords) {
                    WeatherUtil.getAddressFromGeolocation(coords.latitude, coords.longitude).then(function (address) {
                        var startTime = new Date().getTime();

                        WeatherUtil.getWeatherInfo(address, WeatherInfo.towns).then(function (weatherDatas) {
                            var endTime = new Date().getTime();
                            Util.ga.trackTiming('weather', endTime - startTime, 'get', 'info');
                            Util.ga.trackEvent('weather', 'get', WeatherUtil.getShortenAddress(address) +
                                '(' + WeatherInfo.getCityIndex() + ')', endTime - startTime);

                            var city = WeatherUtil.convertWeatherData(weatherDatas);
                            city.address = address;
                            city.location = {"lat": coords.latitude, "long": coords.longitude};
                            WeatherInfo.updateCity(WeatherInfo.getCityIndex(), city);
                            applyWeatherData();
                            deferred.resolve();
                        }, function (error) {
                            var endTime = new Date().getTime();
                            Util.ga.trackTiming('weather', endTime - startTime, 'error', 'info');
                            if (error instanceof Error) {
                                Util.ga.trackEvent('weather', 'error', WeatherUtil.getShortenAddress(address) +
                                    '(' + WeatherInfo.getCityIndex() + ', message:' + error.message + ', code:' + error.code + ')', endTime - startTime);
                            } else {
                                Util.ga.trackEvent('weather', 'error', WeatherUtil.getShortenAddress(address) +
                                    '(' + WeatherInfo.getCityIndex() + ', ' + error + ')', endTime - startTime);
                            }

                            deferred.reject(strFailToGetWeatherInfo);
                        });
                    }, function () {
                        deferred.reject(strFailToGetAddressInfo);
                    });
                }, function () {
                    Util.ga.trackEvent('position', 'error', 'all');
                    var msg = strFailToGetCurrentPosition;
                    if (ionic.Platform.isAndroid()) {
                        msg += "<br>" + strPleaseTurnOnLocationWiFi;
                    }
                    deferred.reject(msg);
                });
            } else {
                var startTime = new Date().getTime();

                WeatherUtil.getWeatherInfo(cityData.address, WeatherInfo.towns).then(function (weatherDatas) {
                    var endTime = new Date().getTime();
                    Util.ga.trackTiming('weather', endTime - startTime, 'get', 'info');
                    Util.ga.trackEvent('weather', 'get', WeatherUtil.getShortenAddress(cityData.address) +
                        '(' + WeatherInfo.getCityIndex() + ')', endTime - startTime);

                    var city = WeatherUtil.convertWeatherData(weatherDatas);
                    WeatherInfo.updateCity(WeatherInfo.getCityIndex(), city);
                    applyWeatherData();
                    deferred.resolve();
                }, function (error) {
                    var endTime = new Date().getTime();
                    Util.ga.trackTiming('weather', endTime - startTime, 'error', 'info');
                    if (error instanceof Error) {
                        Util.ga.trackEvent('weather', 'error', WeatherUtil.getShortenAddress(cityData.address) +
                            '(' + WeatherInfo.getCityIndex() + ', message:' + error.message + ', code:' + error.code + ')', endTime - startTime);
                    } else {
                        Util.ga.trackEvent('weather', 'error', WeatherUtil.getShortenAddress(cityData.address) +
                            '(' + WeatherInfo.getCityIndex() + ', ' + error + ')', endTime - startTime);
                    }
                    deferred.reject(strFailToGetWeatherInfo);
                });
            }

            return deferred.promise;
        }

        function getTodayPosition() {
            var time = new Date();
            var index = 0;

            if ($scope.forecastType === 'short') {
                var hours = time.getHours();
                index = 7; //yesterday 21h

                //large tablet
                if (bodyWidth >= TABLET_WIDTH) {
                    return colWidth*index;
                }

                if(hours >= 3) {
                    //start today
                    index+=1;
                }
                if (hours >= 6) {
                    index+=1;
                }
                if (hours >= 9) {
                    index += 1;
                }

                return colWidth*index;
            }
            else if ($scope.forecastType === 'mid') {

                //large tablet
                if (bodyWidth >= 720) {
                    return 0;
                }
                //today is 3th.
                index = 5;
                return colWidth*index;
            }
            return colWidth*index;
        }

        $scope.onSwipeLeft = function() {
            if (WeatherInfo.getEnabledCityCount() === 1) {
                return;
            }

            WeatherInfo.setNextCityIndex();
            applyWeatherData();
            loadWeatherData();
        };

        $scope.onSwipeRight = function() {
            if (WeatherInfo.getEnabledCityCount() === 1) {
                return;
            }

            WeatherInfo.setPrevCityIndex();
            applyWeatherData();
            loadWeatherData();
        };

        $scope.convertMMDD = function (value) {
            return value.substr(4,2)+'/'+value.substr(6,2);
        };

        function _diffTodayYesterday(current, yesterday) {
            var strSameAsYesterday = "Same as yesterday";
            var strThanYesterday = "%s˚ than yesterday";

            $translate(['LOC_SAME_AS_YESTERDAY', 'LOC_THAN_YESTERDAY']).then(function (translations) {
                strSameAsYesterday = translations.LOC_SAME_AS_YESTERDAY;
                strThanYesterday = translations.LOC_THAN_YESTERDAY;
            }, function (translationIds) {
                console.log("Fail to translate : " + JSON.stringify(translationIds));
            }).finally(function () {
                var str = "";
                if (current.t1h !== undefined && yesterday && yesterday.t1h !== undefined) {
                    var diffTemp = Math.round(current.t1h) - Math.round(yesterday.t1h);
                    if (diffTemp == 0) {
                        str += strSameAsYesterday;
                    }
                    else {
                        var tempStr;
                        if (diffTemp > 0) {
                            tempStr = '+' + diffTemp;
                        }
                        else {
                            tempStr = '' + diffTemp;
                        }
                        str += sprintf(strThanYesterday, tempStr);
                    }
                }
                $scope.diffTempStr = str;
            });
        }

        function _convertKmaRxxToStr(pty, rXX) {
            var str = "~"+rXX;
            if (pty === 1 || pty === 2) {
                str += "mm";
            }
            else if (pty === 3) {
                str += "cm";
            }
            else {
               return "";
            }
            return str;
        }

        function _convertKmaWsdToStr(windGrade)  {
            switch (windGrade) {
                case 0: return "";
                case 1: return "LOC_LIGHT_WIND";
                case 2: return "LOC_MODERATE_WIND";
                case 3: return "LOC_STRONG_WIND";
                case 4: return "LOC_VERY_STRONG_WIND";
            }
            return "";
        }

        function _makeSummary(current, yesterday) {
            var deferred = $q.defer();
            var translations;
            $translate(['LOC_PM10', 'LOC_PM25', 'LOC_AQI', 'LOC_DISCOMFORT_INDEX', 'LOC_FEELS_LIKE',
                'LOC_UV', 'LOC_FOOD_POISONING', 'LOC_RAINFALL', 'LOC_SNOWFALL', 'LOC_PRECIPITATION'
            ]).then(function (trans) {
                translations = trans;
            }, function (translationIds) {
                translations = translationIds;
            }).finally(function () {
                var str = "";
                var item;
                var itemList = [];
                var diffTemp;
                var tmpGrade;

                if (current.t1h !== undefined && yesterday && yesterday.t1h !== undefined) {
                    diffTemp = Math.round(current.t1h) - Math.round(yesterday.t1h);
                    str = $scope.diffTempStr;
                    item = {str: str, grade: Math.abs(diffTemp)};
                    itemList.push(item);
                }

                if (!(current.weatherType == undefined)) {
                    tmpGrade = 1;
                    if (current.weatherType > 3) {
                        tmpGrade = 3;
                    }
                    item = {str: $translate.instant($scope.getWeatherStr(current)), grade: tmpGrade};
                    itemList.push(item);
                }

                if (current.arpltn) {
                    if (current.arpltn.pm10Grade) {
                        tmpGrade = current.arpltn.pm10Grade;
                        str = translations.LOC_PM10 + " " + $translate.instant($scope.getSentimentStr(tmpGrade));
                        item = {str: str, grade: tmpGrade};
                        itemList.push(item);
                    }
                    if (current.arpltn.pm25Grade) {
                        tmpGrade = current.arpltn.pm25Grade;
                        str = translations.LOC_PM25 + " " + $translate.instant($scope.getSentimentStr(tmpGrade));
                        item = {str: str, grade: tmpGrade};
                        itemList.push(item);
                    }
                    if (current.arpltn.khaiGrade) {
                        tmpGrade = current.arpltn.khaiGrade;
                        str = translations.LOC_AQI + " " + $translate.instant($scope.getSentimentStr(tmpGrade));
                        item = {str: str, grade: tmpGrade};
                        itemList.push(item);
                    }
                }

                if (current.rn1 && current.pty) {
                    switch (current.pty) {
                        case 1:
                            current.ptyStr = translations.LOC_RAINFALL;
                            break;
                        case 2:
                            current.ptyStr = translations.LOC_PRECIPITATION;
                            break;
                        case 3:
                            current.ptyStr = translations.LOC_SNOWFALL;
                            break;
                        default :
                            current.ptyStr = "";
                    }
                    current.rn1Str = _convertKmaRxxToStr(current.pty, rn1);
                    item = {str: current.ptyStr + " " + current.rn1Str, grade: current.rn1+3};
                    itemList.push(item);
                }

                if (current.dsplsGrade && current.dsplsGrade && current.t1h >= 20) {
                    tmpGrade = current.dsplsGrade;
                    str = translations.LOC_DISCOMFORT_INDEX + " ";
                    str += $translate.instant($scope.getLowHighGradeStr(tmpGrade));
                    item = {str:str, grade: tmpGrade};
                    itemList.push(item);
                }

                if (current.sensorytem && current.sensorytem !== current.t1h) {
                    diffTemp = Math.round(current.sensorytem - current.t1h);
                    str = translations.LOC_FEELS_LIKE + " " + current.sensorytem +"˚";
                    item = {str :str, grade: Math.abs(diffTemp)};
                    itemList.push(item);
                }

                if (current.ultrvGrade && Number(current.time) < 1800) {
                    tmpGrade = current.ultrvGrade;
                    str = translations.LOC_UV + " ";
                    str += $translate.instant($scope.getLowHighGradeStr(tmpGrade));
                    item = {str: str, grade: tmpGrade+1};
                    itemList.push(item);
                }

                if (current.wsdGrade) {
                    str = $translate.instant(_convertKmaWsdToStr(current.wsdGrade));
                    item = {str:str, grade: current.wsdGrade+1};
                    itemList.push(item);
                }

                if (current.fsnGrade) {
                    var tmpGrade = current.fsnGrade;
                    str = translations.LOC_FOOD_POISONING + " ";
                    str += $translate.instant($scope.getAttentionWarningGradeStr(tmpGrade));
                    item = {str: str, grade: tmpGrade+1};
                    itemList.push(item);
                }

                //감기

                itemList.sort(function (a, b) {
                    if(a.grade > b.grade){
                        return -1;
                    }
                    if(a.grade < b.grade){
                        return 1;
                    }
                    return 0;
                });

                str = itemList[0].str+","+itemList[1].str;
                $rootScope.summary = str;
                deferred.resolve(str);
            });

            return deferred.promise;
        }

        $scope.$on('reloadEvent', function(event, sender) {
            if (sender == 'resume') {
               if (confirmPopup)  {
                   console.log('skip event when retry load popup is shown');
                   return;
               }
            }
            console.log('called by update weather event');
            WeatherInfo.reloadCity(WeatherInfo.getCityIndex());
            loadWeatherData();
        });

        $scope.headerScroll = function drawShadow() {
            var rect = $ionicScrollDelegate.$getByHandle("body").getScrollPosition();
            if (!(rect == undefined) && rect.hasOwnProperty('top') && rect.top > 0) {
                alphaBar.css('box-shadow','0px 1px 5px 0 rgba(0, 0, 0, 0.26)');
            }
            else {
                alphaBar.css('box-shadow','initial');
            }
        };

        init();
    })

    .controller('SearchCtrl', function ($scope, $rootScope, $ionicPlatform, $ionicScrollDelegate, TwAds, $q, $ionicHistory,
                                        $location, WeatherInfo, WeatherUtil, Util, ionicTimePicker, Push, $ionicLoading, $translate) {
        $scope.searchWord = undefined;
        $scope.searchResults = [];
        $scope.cityList = [];
        $scope.imgPath = Util.imgPath;
        $scope.isEditing = false;

        var towns = WeatherInfo.towns;
        var searchIndex = -1;

        var strFailToGetAddressInfo = "Fail to get location information";
        var strFailToGetCurrentPosition = "Fail to find your current location";
        var strFailToGetWeatherInfo = "Fail to get weather info.";
        var strPleaseTurnOnLocationWiFi = "Please turn on location and Wi-FI";
        var strError = "Error";
        var strAlreadyTheSameLocationHasBeenAdded = "Already the same location has been added.";
        var strCurrent = "Current";
        var strLocation = "Location";

        $translate(['LOC_FAIL_TO_GET_LOCATION_INFORMATION', 'LOC_FAIL_TO_FIND_YOUR_CURRENT_LOCATION',
            'LOC_FAIL_TO_GET_WEATHER_INFO', 'LOC_PLEASE_TURN_ON_LOCATION_AND_WIFI', 'LOC_ERROR',
            'LOC_ALREADY_THE_SAME_LOCATION_HAS_BEEN_ADDED', 'LOC_CURRENT', 'LOC_LOCATION']).then(function (translations) {
            strFailToGetAddressInfo = translations.LOC_FAIL_TO_GET_LOCATION_INFORMATION;
            strFailToGetCurrentPosition = translations.LOC_FAIL_TO_FIND_YOUR_CURRENT_LOCATION;
            strFailToGetWeatherInfo = translations.LOC_FAIL_TO_GET_WEATHER_INFO;
            strPleaseTurnOnLocationWiFi = translations.LOC_PLEASE_TURN_ON_LOCATION_AND_WIFI;
            strError = translations.LOC_ERROR;
            strAlreadyTheSameLocationHasBeenAdded = translations.LOC_ALREADY_THE_SAME_LOCATION_HAS_BEEN_ADDED;
            strCurrent = translations.LOC_CURRENT;
            strLocation = translations.LOC_LOCATION;
        }, function (translationIds) {
            console.log("Fail to translate : " + JSON.stringify(translationIds));
        });

        function init() {
            $ionicHistory.clearHistory();

            for (var i = 0; i < WeatherInfo.getCityCount(); i += 1) {
                var city = WeatherInfo.getCityOfIndex(i);
                var address = WeatherUtil.getShortenAddress(city.address).split(",");
                var todayData = null;

                if (city.currentPosition && city.address === null) {
                    address = [strCurrent, strLocation];
                }
                if (!city.currentWeather) {
                    city.currentWeather = {};
                }
                if (!city.currentWeather.skyIcon) {
                    city.currentWeather.skyIcon = 'Sun';
                }
                if (city.currentWeather.t1h === undefined) {
                    city.currentWeather.t1h = '-';
                }
                if (city.dayTable != null) {
                    todayData = city.dayTable.filter(function (data) {
                        return (data.fromToday === 0);
                    });
                }
                if (!todayData || todayData.length === 0) {
                    todayData = [{tmn:'-', tmx:'-'}];
                }

                var data = {
                    address: address,
                    currentPosition: city.currentPosition,
                    disable: city.disable,
                    skyIcon: city.currentWeather.skyIcon,
                    t1h: city.currentWeather.t1h,
                    tmn: todayData[0].tmn,
                    tmx: todayData[0].tmx,
                    alarmInfo: Push.getAlarm(i)
                };
                $scope.cityList.push(data);
                loadWeatherData(i);
            }
        }

        $scope.OnChangeSearchWord = function() {
            $scope.isEditing = false;

            if ($scope.searchWord === "") {
                $scope.searchWord = undefined;
                $scope.searchResults = [];
                return;
            }

            $scope.searchResults = [];
            $ionicScrollDelegate.$getByHandle('cityList').scrollTop();
            searchIndex = 0;
            $scope.OnScrollResults();
        };

        $scope.OnSearchCurrentPosition = function() {
            $scope.isEditing = false;

            $ionicLoading.show();

            WeatherUtil.getCurrentPosition().then(function (coords) {
                WeatherUtil.getAddressFromGeolocation(coords.latitude, coords.longitude).then(function (address) {
                    var addressArray = WeatherUtil.convertAddressArray(address);
                    var townAddress = WeatherUtil.getTownFromFullAddress(addressArray);
                    if (townAddress.first === "" && townAddress.second === "" && townAddress.third === "") {
                        $scope.showAlert(strError, strFailToGetAddressInfo);
                    } else {
                        if (townAddress.third === "") {
                            if (townAddress.second === "") {
                                $scope.searchWord = townAddress.first;
                            } else {
                                $scope.searchWord = townAddress.second;
                            }
                        } else {
                            $scope.searchWord = townAddress.third;
                        }
                        $scope.searchResults = [];
                        $scope.searchResults.push(townAddress);
                        $ionicScrollDelegate.$getByHandle('cityList').scrollTop();
                        searchIndex = -1;
                    }
                    $ionicLoading.hide();
                }, function () {
                    $scope.showAlert(strError, strFailToGetAddressInfo);
                    $ionicLoading.hide();
                });
            }, function () {
                Util.ga.trackEvent('position', 'error', 'all');
                var msg = strFailToGetCurrentPosition;
                if (ionic.Platform.isAndroid()) {
                    msg += "<br>" + strPleaseTurnOnLocationWiFi;
                }
                $scope.showAlert(strError, msg);
                $ionicLoading.hide();
            });
        };

        $scope.OnEdit = function() {
            $scope.isEditing = !$scope.isEditing;
            if ($scope.isEditing) {
                $scope.searchWord = undefined;
                $scope.searchResults = [];
            }
        };

        $scope.OnScrollResults = function() {
            if ($scope.searchWord !== undefined && searchIndex !== -1) {
                for (var i = searchIndex; i < towns.length; i++) {
                    var town = towns[i];
                    if (town.first.indexOf($scope.searchWord) >= 0 || town.second.indexOf($scope.searchWord) >= 0
                        || town.third.indexOf($scope.searchWord) >= 0) {
                        $scope.searchResults.push(town);
                        if ($scope.searchResults.length % 10 === 0) {
                            searchIndex = i + 1;
                            return;
                        }
                    }
                }
                searchIndex = -1;
            }
        };

        $scope.OnSelectResult = function(result) {
            if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) { 
                if (cordova.plugins.Keyboard.isVisible) {
                    return cordova.plugins.Keyboard.close(); 
                }
            }

            $scope.searchWord = undefined;
            $scope.searchResults = [];
            $ionicLoading.show();

            var address = "대한민국"+" "+result.first;
            if (result.second !== "") {
                if (result.first.slice(-1) === '도' && result.second.slice(-1) === '구') {
                    if (result.second.indexOf(' ') > 0) {
                        //si gu
                        var aTemp = result.second.split(" ");
                        address = " " + aTemp[0];
                        address = " " + aTemp[1];
                    }
                    else {
                        //sigu
                        address += " " + result.second.substr(0, result.second.indexOf('시')+1);
                        address += " " + result.second.substr(result.second.indexOf('시')+1, result.second.length);
                    }
                }
                else {
                    address += " " + result.second;
                }
            }
            if (result.third !== "") {
                address += " " + result.third;
            }

            var startTime = new Date().getTime();

            WeatherUtil.getWeatherInfo(address, WeatherInfo.towns).then(function (weatherDatas) {
                var endTime = new Date().getTime();
                Util.ga.trackTiming('weather', endTime - startTime, 'get', 'info');
                Util.ga.trackEvent('weather', 'get', WeatherUtil.getShortenAddress(address) , endTime - startTime);

                var city = WeatherUtil.convertWeatherData(weatherDatas);
                city.currentPosition = false;
                city.address = address;
                //검색하는 경우 location 정보가 없음. 업데이트 필요.
                //city.location = location;

                if (WeatherInfo.addCity(city) === false) {
                    Util.ga.trackEvent('city', 'add error', WeatherUtil.getShortenAddress(address), WeatherInfo.getCityCount() - 1);
                    $scope.showAlert(strError, strAlreadyTheSameLocationHasBeenAdded);
                }
                else {
                    Util.ga.trackEvent('city', 'add', WeatherUtil.getShortenAddress(address), WeatherInfo.getCityCount() - 1);

                    WeatherInfo.setCityIndex(WeatherInfo.getCityCount() - 1);
                    $location.path('/tab/forecast');
                }
                $ionicLoading.hide();
            }, function (error) {
                var endTime = new Date().getTime();
                Util.ga.trackTiming('weather', endTime - startTime, 'error', 'info');
                if (error instanceof Error) {
                    Util.ga.trackEvent('weather', 'error', WeatherUtil.getShortenAddress(address) +
                        '(message:' + error.message + ', code:' + error.code + ')', endTime - startTime);
                } else {
                    Util.ga.trackEvent('weather', 'error', WeatherUtil.getShortenAddress(address) +
                        '(' + error + ')', endTime - startTime);
                }

                $scope.showAlert(strError, strFailToGetWeatherInfo);

                $ionicLoading.hide();
            });
        };

        $scope.OnSelectCity = function(index) {
            if ($scope.isEditing === true) {
                return;
            }

            if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
                if (cordova.plugins.Keyboard.isVisible) {
                    return cordova.plugins.Keyboard.close();
                }
            }

            WeatherInfo.setCityIndex(index);
            $location.path('/tab/forecast');
        };

        $scope.OnDisableCity = function() {
            Util.ga.trackEvent('city', 'disable', $scope.cityList[0].disable, 0);

            WeatherInfo.disableCity($scope.cityList[0].disable);

            return false; //OnDisableCity가 호출되지 않도록 이벤트 막음
        };

        $scope.OnDeleteCity = function(index) {
            Util.ga.trackEvent('city', 'delete', WeatherUtil.getShortenAddress(WeatherInfo.getCityOfIndex(index).address), index);

            if ($scope.cityList[index].alarmInfo != undefined) {
                Push.removeAlarm($scope.cityList[index].alarmInfo);
            }
            $scope.cityList.splice(index, 1);
            WeatherInfo.removeCity(index);

            return false; //OnSelectCity가 호출되지 않도록 이벤트 막음
        };

        $scope.OnOpenTimePicker = function (index) {
            var ipObj1 = {
                callback: function (val) {      //Mandatory
                    if (typeof(val) === 'undefined') {
                        console.log('closed');
                    } else if (val == 0) {
                        Util.ga.trackEvent('alarm', 'cancel', WeatherUtil.getShortenAddress(WeatherInfo.getCityOfIndex(index).address), index);

                        console.log('cityIndex='+index+' alarm canceled');
                        if ($scope.cityList[index].alarmInfo != undefined) {
                            Push.removeAlarm($scope.cityList[index].alarmInfo);
                            $scope.cityList[index].alarmInfo = undefined;
                        }
                    } else {
                        Util.ga.trackEvent('alarm', 'set', WeatherUtil.getShortenAddress(WeatherInfo.getCityOfIndex(index).address), index);

                        var selectedTime = new Date();
                        selectedTime.setHours(0,0,0,0);
                        selectedTime.setSeconds(val);

                        console.log('index=' + index + ' Selected epoch is : ' + val + 'and the time is ' +
                                    selectedTime.toString());

                        Push.updateAlarm(index, WeatherInfo.getCityOfIndex(index).address, selectedTime, function (err, alarmInfo) {
                            console.log('alarm='+JSON.stringify(alarmInfo));
                            $scope.cityList[index].alarmInfo = alarmInfo;
                        });
                    }
                }
            };
            if ($scope.cityList[index].alarmInfo != undefined) {
                var date = new Date($scope.cityList[index].alarmInfo.time);
                console.log(date);
                ipObj1.inputTime = date.getHours() * 60 * 60 + date.getMinutes() * 60;
                console.log('inputTime='+ipObj1.inputTime);
            }
            else {
                ipObj1.inputTime = 8*60*60; //AM 8:00
            }

            var strSetting = "Setting";
            var strDelete = "Delete";
            var strClose = "Close";
            $translate(['LOC_SETTING', 'LOC_DELETE', 'LOC_CLOSE']).then(function (translations) {
                strSetting = translations.LOC_SETTING;
                strDelete = translations.LOC_DELETE;
                strClose = translations.LOC_CLOSE;
            }, function (translationIds) {
                console.log("Fail to translate "+ JSON.stringify(translationIds));
            }).finally(function () {
                ipObj1.setLabel = strSetting;
                ipObj1.cancelLabel = strDelete;
                ipObj1.closeLabel = strClose;
                ionicTimePicker.openTimePicker(ipObj1);
            });
        };

        function loadWeatherData(index) {
            if (WeatherInfo.canLoadCity(index) === true) {
                updateWeatherData(index).then(function (city) {
                    index = WeatherInfo.getIndexOfCity(city);
                    if (index !== -1) {
                        WeatherInfo.updateCity(index, city);

                        var address = WeatherUtil.getShortenAddress(city.address).split(",");
                        var todayData = city.dayTable.filter(function (data) {
                            return (data.fromToday === 0);
                        });

                        var data = $scope.cityList[index];
                        data.address = address;
                        data.skyIcon = city.currentWeather.skyIcon;
                        data.t1h = city.currentWeather.t1h;
                        data.tmn = todayData[0].tmn;
                        data.tmx = todayData[0].tmx;
                    }
                });
            }
        }

        function updateWeatherData(index) {
            var deferred = $q.defer();

            var cityData = WeatherInfo.getCityOfIndex(index);
            if (cityData.currentPosition === true) {
                WeatherUtil.getCurrentPosition().then(function (coords) {
                    WeatherUtil.getAddressFromGeolocation(coords.latitude, coords.longitude).then(function (address) {
                        var startTime = new Date().getTime();

                        WeatherUtil.getWeatherInfo(address, WeatherInfo.towns).then(function (weatherDatas) {
                            var endTime = new Date().getTime();
                            Util.ga.trackTiming('weather', endTime - startTime, 'get', 'info');
                            Util.ga.trackEvent('weather', 'get', WeatherUtil.getShortenAddress(address) +
                                '(' + index + ')', endTime - startTime);

                            var city = WeatherUtil.convertWeatherData(weatherDatas);
                            city.currentPosition = true;
                            city.address = address;
                            city.location = {"lat": coords.latitude, "long": coords.longitude};
                            deferred.resolve(city);
                        }, function (error) {
                            var endTime = new Date().getTime();
                            Util.ga.trackTiming('weather', endTime - startTime, 'error', 'info');
                            if (error instanceof Error) {
                                Util.ga.trackEvent('weather', 'error', WeatherUtil.getShortenAddress(address) +
                                    '(' + index + ', message:' + error.message + ', code:' + error.code + ')', endTime - startTime);
                            } else {
                                Util.ga.trackEvent('weather', 'error', WeatherUtil.getShortenAddress(address) +
                                    '(' + index + ', ' + error + ')', endTime - startTime);
                            }

                            deferred.reject();
                        });
                    }, function () {
                        deferred.reject();
                    });
                }, function () {
                    Util.ga.trackEvent('position', 'error', 'all');
                    deferred.reject();
                });
            } else {
                var startTime = new Date().getTime();

                WeatherUtil.getWeatherInfo(cityData.address, WeatherInfo.towns).then(function (weatherDatas) {
                    var endTime = new Date().getTime();
                    Util.ga.trackTiming('weather', endTime - startTime, 'get', 'info');
                    Util.ga.trackEvent('weather', 'get', WeatherUtil.getShortenAddress(cityData.address) +
                        '(' + index + ')', endTime - startTime);

                    var city = WeatherUtil.convertWeatherData(weatherDatas);
                    city.currentPosition = false;
                    city.address = cityData.address;
                    deferred.resolve(city);
                }, function (error) {
                    var endTime = new Date().getTime();
                    Util.ga.trackTiming('weather', endTime - startTime, 'error', 'info');
                    if (error instanceof Error) {
                        Util.ga.trackEvent('weather', 'error', WeatherUtil.getShortenAddress(cityData.address) +
                            '(' + index + ', message:' + error.message + ', code:' + error.code + ')', endTime - startTime);
                    } else {
                        Util.ga.trackEvent('weather', 'error', WeatherUtil.getShortenAddress(cityData.address) +
                            '(' + index + ', ' + error + ')', endTime - startTime);
                    }

                    deferred.reject();
                });
            }

            return deferred.promise;
        }

        init();
    })

    .controller('SettingCtrl', function($scope, $http, Util, Purchase, $ionicHistory, $translate) {
        function init() {
            $ionicHistory.clearHistory();

            if (ionic.Platform.isAndroid()) {
                //get interval time;
                $scope.updateInterval = "0";
                $scope.widgetOpacity = "69";

                if (window.plugins == undefined || plugins.appPreferences == undefined) {
                    console.log('appPreferences is undefined');
                    return;
                }

                var suitePrefs = plugins.appPreferences.suite(Util.suiteName);
                suitePrefs.fetch(
                    function (value) {
                        if (value == null) {
                            value = "0"
                        }
                        $scope.updateInterval = ""+value;
                        console.log("fetch preference Success: " + value);
                    }, function (error) {
                        console.log("fetch preference Error: " + error);
                    }, 'updateInterval'
                );

                suitePrefs.fetch(
                    function (value) {
                        if (value == null) {
                            value = "69"
                        }
                        $scope.widgetOpacity = ""+value;
                        console.log("fetch preference Success: " + value);
                    }, function (error) {
                        console.log("fetch preference Error: " + error);
                    }, 'widgetOpacity'
                );
            }
        }

        $scope.version = Util.version;

        $scope.sendMail = function() {

            var to = twClientConfig.mailTo;
            var subject = 'Send feedback';
            var body = '\n====================\nApp Version : ' + Util.version + '\nUUID : ' + window.device.uuid
                + '\nUA : ' + ionic.Platform.ua + '\n====================\n';

            $translate('LOC_SEND_FEEDBACK').then(function (translations) {
                subject = translations;
            }, function (translationIds) {
                subject = translationIds;
            }).finally(function () {
                window.location.href = 'mailto:' + to + '?subject=' + subject + '&body=' + encodeURIComponent(body);
            });

            Util.ga.trackEvent('action', 'click', 'send mail');
        };

        $scope.openMarket = function() {
            var src = "";
            if (ionic.Platform.isIOS()) {
                src = twClientConfig.iOSStoreUrl;
            }
            else if (ionic.Platform.isAndroid()) {
                src = twClientConfig.androidStoreUrl;
            }
            else {
                src = twClientConfig.etcUrl;
            }

            if (window.cordova && cordova.InAppBrowser) {
                cordova.InAppBrowser.open(src, "_system");
                Util.ga.trackEvent('action', 'click', 'open market');
            }
            else {
                var options = {
                    location: "yes",
                    clearcache: "yes",
                    toolbar: "no"
                };
                window.open(src, "_blank", options);
            }
        };

        /**
         * 설정에 정보 팝업으로, 늦게 로딩되어도 상관없고 호출될 가능성이 적으므로 그냥 현상태 유지.
         */
        $scope.openInfo = function() {
            var strTitle = "TodayWeather";
            var strMsg;
            $translate(['LOC_TODAYWEATHER','LOC_WEATHER_INFORMATION', 'LOC_KOREA_METEOROLOGICAL_ADMINISTRATION', 'LOC_AQI_INFORMATION', 'LOC_KOREA_ENVIRONMENT_CORPORATION', 'LOC_IT_IS_UNAUTHENTICATED_REALTIME_DATA_THERE_MAY_BE_ERRORS']).then(function (translations) {
                strTitle = translations.LOC_TODAYWEATHER;
                strMsg = translations.LOC_WEATHER_INFORMATION + " : "  + translations.LOC_KOREA_METEOROLOGICAL_ADMINISTRATION;
                strMsg += "<br>";
                strMsg += translations.LOC_AQI_INFORMATION + " : " + translations.LOC_KOREA_ENVIRONMENT_CORPORATION;
                strMsg += "<br>";
                strMsg += translations.LOC_IT_IS_UNAUTHENTICATED_REALTIME_DATA_THERE_MAY_BE_ERRORS;
            }, function (translationIds) {
                strTitle = translationIds.LOC_TODAYWEATHER;
                strMsg = translationIds.LOC_WEATHER_INFORMATION + " : "  + translationIds.LOC_KOREA_METEOROLOGICAL_ADMINISTRATION;
                strMsg += "<br>";
                strMsg += translationIds.LOC_AQI_INFORMATION + " : " + translationIds.LOC_KOREA_ENVIRONMENT_CORPORATION;
                strMsg += "<br>";
                strMsg += translationIds.LOC_IT_IS_UNAUTHENTICATED_REALTIME_DATA_THERE_MAY_BE_ERRORS;
            }).finally(function () {
                $scope.showAlert(strTitle, strMsg);
            });
        };

        $scope.isAndroid = function () {
            return ionic.Platform.isAndroid();
        };

        $scope.changeWidgetOpacity = function (val) {
            console.log("widget opacity ="+ val);
            if (window.plugins == undefined || plugins.appPreferences == undefined) {
                console.log('appPreferences is undefined');
                return;
            }

            var suitePrefs = plugins.appPreferences.suite(Util.suiteName);
            suitePrefs.store(
                function (value) {
                    console.log("save preference Success: " + value);
                },
                function (error) {
                    console.log("save preference Error: " + error);
                }, 'widgetOpacity', +val
            );
        };

        $scope.changeUpdateInterval = function (val) {
            console.log("update interval ="+ val);
            if (window.plugins == undefined || plugins.appPreferences == undefined) {
                console.log('appPreferences is undefined');
                return;
            }

            var suitePrefs = plugins.appPreferences.suite(Util.suiteName);
            suitePrefs.store(
                function (value) {
                    console.log("save preference Success: " + value);
                },
                function (error) {
                    console.log("save preference Error: " + error);
                }, 'updateInterval', +val
            );
        };

        $scope.hasInAppPurchase = function () {
            return Purchase.hasInAppPurchase || Purchase.paidAppUrl.length > 0;
        };

        init();
    })

    .controller('TabCtrl', function($scope, $ionicPlatform, $ionicPopup, $interval, WeatherInfo, WeatherUtil,
                                     $location, TwAds, $rootScope, Util, $translate) {
        var currentTime;
        var strError = "Error";
        var strAddLocation = "Add locations";
        var strOkay = "OK";
        var strCancel = "Cancel";
        $translate(['LOC_ERROR', 'LOC_ADD_LOCATIONS', 'LOC_OK', 'LOC_CANCEL']).then(function (translations) {
            strError = translations.LOC_ERROR;
            strAddLocation = translations.LOC_ADD_LOCATIONS;
            strOkay = translations.LOC_OK;
            strCancel = translations.LOC_CANCEL;
        }, function (translationIds) {
            console.log("Fail to translate : "+JSON.stringify(translationIds));
        });

        function init() {
            currentTime = new Date();
            //$scope.currentTimeString = WeatherUtil.convertTimeString(currentTime); // 10월 8일(수) 12:23 AM
            //$interval(function() {
            //    var newDate = new Date();
            //    if(newDate.getMinutes() != currentTime.getMinutes()) {
            //        currentTime = newDate;
            //        $scope.currentTimeString = WeatherUtil.convertTimeString(currentTime);
            //    }
            //}, 1000);

            TwAds.init();
            TwAds.setLayout(TwAds.enableAds == undefined? TwAds.requestEnable:TwAds.enableAds);
        }

        $scope.doTabForecast = function(forecastType) {
            if (WeatherInfo.getEnabledCityCount() === 0) {
                $scope.showAlert(strError, strAddLocation);
                return;
            }
            if ($location.path() === '/tab/forecast' && forecastType === 'forecast') {
                $scope.$broadcast('reloadEvent', 'tab');
                Util.ga.trackEvent('action', 'tab', 'reload');
            }
            else if ($location.path() === '/tab/dailyforecast' && forecastType === 'dailyforecast') {
                $scope.$broadcast('reloadEvent', 'tab');
                Util.ga.trackEvent('action', 'tab', 'reload');
            }
            else {
                if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
                    if (cordova.plugins.Keyboard.isVisible) {
                        cordova.plugins.Keyboard.close();
                        setTimeout(function(){
                            if (forecastType === 'forecast') {
                                $location.path('/tab/forecast');
                            }
                            else {
                                $location.path('/tab/dailyforecast');
                            }
                        }, 100);
                        return;
                    }
                }

                if (forecastType === 'forecast') {
                    $location.path('/tab/forecast');
                }
                else {
                    $location.path('/tab/dailyforecast');
                }
            }
        };

        $scope.doTabShare = function() {
            if (!(window.plugins && window.plugins.socialsharing)) {
                console.log('plugins socialsharing is undefined');
                return;
            }
            var cityData = WeatherInfo.getCityOfIndex(WeatherInfo.getCityIndex());
            if (cityData == undefined || cityData.location == undefined) {
                console.log('Fail to load city');
                $scope.showAlert(strError, strAddLocation);
                return;
            }

            var address = WeatherUtil.getShortenAddress(cityData.address);
            var t1h = cityData.currentWeather.t1h;
            var emoji = WeatherUtil.getWeatherEmoji(cityData.currentWeather.skyIcon);
            var tmx;
            var tmn;
            var summary = $rootScope.summary;
            var shareUrl = 'http://abr.ge/mxld';
            var len = cityData.dayTable.length;
            for(var i=0;i<len; i++) {
                var data = cityData.dayTable[i];
                if (data.fromToday == 0) {
                    tmx = data.tmx;
                    tmn = data.tmn;
                    break;
                }
            }
            var message = '';

            $translate(['LOC_CURRENT', 'LOC_HIGH', 'LOC_LOW', 'LOC_TODAYWEATHER']).then(function (translations) {
                message += address+'\n';
                message += translations.LOC_CURRENT+' '+t1h+'˚ ';
                message += emoji+'\n';
                message += translations.LOC_HIGH+' '+tmx+'˚, '+translations.LOC_LOW+' '+tmn+'˚\n';
                message += summary+'\n\n';
                message += translations.LOC_TODAYWEATHER + ' ' + shareUrl;
            }, function (translationIds) {
                message += address+'\n';
                message += translationIds.LOC_CURRENT+' '+t1h+'˚ ';
                message += emoji+'\n';
                message += translationIds.LOC_HIGH+' '+tmx+'˚, '+translationIds.LOC_LOW+' '+tmn+'˚\n';
                message += summary+'\n\n';
                message += translationIds.LOC_TODAYWEATHER + ' ' + shareUrl;
            }).finally(function () {
                window.plugins.socialsharing.share(message, null, null, null);
            });

            Util.ga.trackEvent('action', 'tab', 'share');
            if (!twClientConfig.debug && window.AirBridgePlugin) {
                AirBridgePlugin.goal("weathershare");
            }
        };

        $scope.showAlert = function(title, msg, callback) {
            var alertPopup = $ionicPopup.alert({
                title: title,
                template: msg,
                okText: strOkay
            });
            alertPopup.then(function() {
                console.log("alertPopup close");
                if (callback != undefined) {
                    callback();
                }
            });
        };

        $scope.showConfirm = function(title, template, callback) {
            var confirmPopup = $ionicPopup.confirm({
                title: title,
                template: template,
                okText: strOkay,
                cancelText: strCancel
            });
            confirmPopup.then(function (res) {
                if (res) {
                    console.log("You are sure");
                } else {
                    console.log("You are not sure");
                }
                callback(res);
            });
        };

        init();
    })

    .controller('GuideCtrl', function($scope, $rootScope, $ionicSlideBoxDelegate, $ionicNavBarDelegate,
                                      $location, Util, TwAds, $ionicPopup, WeatherInfo, $translate) {
        var guideVersion = null;

        $scope.data = { 'autoSearch': false };

        var strClose = "Close";
        var strSkip = "Skip";
        var strCancel = "Cancel";
        var strOkay = "OK";
        var strUseYourCurrentLocation = "Use your current location";
        var strFindLocationByName = "Find location by name";
        var strTodayWeather = "TodayWeather";

        function init() {
            //for fast close ads when first loading
            TwAds.setShowAds(false);

            var bodyHeight;

            if (window.screen.height) {
                bodyHeight = window.screen.height;
            }
            else if (window.innerHeight) {
                bodyHeight = window.innerHeight;
            }
            else if (window.outerHeight) {
                bodyHeight = window.outerHeight;
            }
            else {
                console.log("Fail to get window height");
                bodyHeight = 640;
            }

            $scope.bigFont = (bodyHeight - 56) * 0.0512;
            $scope.smallFont = (bodyHeight - 56) * 0.0299;

            guideVersion = localStorage.getItem("guideVersion");

            $translate(['LOC_TODAYWEATHER', 'LOC_CLOSE', 'LOC_SKIP', 'LOC_CANCEL', 'LOC_OK',
                'LOC_USE_YOUR_CURRENT_LOCATION', 'LOC_FIND_LOCATION_BY_NAME']).then(function (translations) {
                strTodayWeather = translations.LOC_TODAYWEATHER;
                strClose = translations.LOC_CLOSE;
                strSkip = translations.LOC_SKIP;
                strCancel = translations.LOC_CANCEL;
                strOkay = translations.LOC_OK;
                strUseYourCurrentLocation = translations.LOC_USE_YOUR_CURRENT_LOCATION;
                strFindLocationByName = translations.LOC_FIND_LOCATION_BY_NAME;
            }, function (translationIds) {
                console.log("Fail to translate : " + JSON.stringify(translationIds));
            }).finally(function () {
                update();
            });
        }

        function close() {
            if (guideVersion === null) {
                showPopup();
            } else {
                if (Util.guideVersion == Number(guideVersion)) {
                    TwAds.setShowAds(true);
                    $location.path('/tab/setting');
                } else {
                    localStorage.setItem("guideVersion", Util.guideVersion.toString());
                    TwAds.setShowAds(true);
                    $location.path('/tab/forecast');
                }
            }
        }

        function update() {
            if ($ionicSlideBoxDelegate.currentIndex() == $ionicSlideBoxDelegate.slidesCount() - 1) {
                $scope.leftText = "<";
                $scope.rightText = strClose;
            } else {
                $scope.leftText = strSkip;
                $scope.rightText = ">";
            }
        }

        function showPopup() {
            var popup = $ionicPopup.show({
                template: '<ion-list>' +
                    '<ion-radio ng-model="data.autoSearch" ng-value="true">'+strUseYourCurrentLocation+'</ion-radio>' +
                    '<ion-radio ng-model="data.autoSearch" ng-value="false">'+strFindLocationByName+'</ion-radio>' +
                    '</ion-list>',
                title: strTodayWeather,
                scope: $scope,
                cssClass: 'ionic_popup',
                buttons: [
                    {
                        text: strCancel,
                        type: 'button_cancel'
                    },
                    {
                        text: strOkay,
                        type: 'button_close',
                        onTap: function() {
                            return $scope.data.autoSearch;
                        }
                    }
                ]
            });

            popup.then(function(res) {
                if (res === undefined) { // cancel button
                    return;
                }

                localStorage.setItem("guideVersion", Util.guideVersion.toString());
                TwAds.setShowAds(true);
                if (res === true) { // autoSearch
                    Util.ga.trackEvent('action', 'click', 'auto search');
                    WeatherInfo.disableCity(false);
                    $location.path('/tab/forecast');
                } else {
                    Util.ga.trackEvent('action', 'click', 'city search');
                    $location.path('/tab/search');
                }
            });
        }

        $scope.onSlideChanged = function() {
            update();
        };

        $scope.onLeftClick = function() {
            if ($ionicSlideBoxDelegate.currentIndex() == $ionicSlideBoxDelegate.slidesCount() - 1) {
                Util.ga.trackEvent('action', 'click', 'guide previous');
                $ionicSlideBoxDelegate.previous();
            } else {
                Util.ga.trackEvent('action', 'click', 'guide skip');
                close();
            }
        };

        $scope.onRightClick = function() {
            if ($ionicSlideBoxDelegate.currentIndex() == $ionicSlideBoxDelegate.slidesCount() - 1) {
                Util.ga.trackEvent('action', 'click', 'guide close');
                close();
            } else {
                Util.ga.trackEvent('action', 'click', 'guide next');
                $ionicSlideBoxDelegate.next();
            }
        };

        $scope.onClose = function() {
            Util.ga.trackEvent('action', 'click', 'guide top close');
            close();
        };

        $scope.getGuideImg = function (number) {
            var imgPath;
            if (ionic.Platform.isAndroid()) {
                imgPath = "img/guide_android_0";
            }
            else {
                imgPath = "img/guide-0";
            }
            imgPath += ""+number+".png";
            console.log(imgPath);

            return imgPath;
        };

        $scope.$on('$ionicView.leave', function() {
            TwAds.setShowAds(true);
        });

        $scope.$on('$ionicView.enter', function() {
            TwAds.setShowAds(false);
            $ionicSlideBoxDelegate.slide(0);
        });

        init();
    });

