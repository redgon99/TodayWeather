/**
 * Created by Peter on 2016. 3. 17..
 */
var request = require('request');
var async = require('async');
var modelGeocode = require('../../models/worldWeather/modelGeocode.js');
var modelWuForecast = require('../../models/worldWeather/modelWuForecast');
var modelWuCurrent = require('../../models/worldWeather/modelWuCurrent');
var modelDSForecast = require('../../models/worldWeather/modelDSForecast');
var config = require('../../config/config');


var commandList = ['restart', 'renewGeocodeList'];
var weatherCategory = ['forecast', 'current'];

var itemWuCurrent = ['date', 'desc', 'code', 'tmmp', 'ftemp', 'humid', 'windspd', 'winddir', 'cloud', 'vis', 'slp', 'dewpoint'];
var itemWuForecastSummary =[
    'date',
    'sunrise',
    'sunset',
    'moonrise',
    'moonset',
    'tmax',
    'tmin',
    'precip',
    'rain',
    'snow',
    'prob',
    'humax',
    'humin',
    'windspdmax',
    'windgstmax',
    'slpmax',
    'slpmin'
];
var itemWuForecast = [
    'date',
    'time',
    'utcDate',
    'utcTime',
    'desc',
    'code',
    'tmp',
    'ftmp',
    'winddir',
    'windspd',
    'windgst',
    'cloudlow',
    'cloudmid',
    'cloudhigh',
    'cloudtot',
    'precip',
    'rain',
    'snow',
    'fsnow',
    'prob',
    'humid',
    'dewpoint',
    'vis',
    'splmax'
];

/**
 *
 * @returns {controllerWorldWeather}
 */
function controllerWorldWeather(){
    var self = this;

    self.geocodeList = [];
    /*****************************************************************************
     * Public Functions (For Interface)
     *****************************************************************************/
    /**
     *
     * @param req
     * @param res
     */
    self.sendResult = function(req, res){
        if(req.error){
            res.json(req.error);
            return;
        }

        if(req.result){
            res.json(req.result);
            return;
        }

        res.json({result: 'Unknow result'});
        return;
    };

    /**
     *
     * @param req
     * @param res
     * @param next
     */
    self.showUsage = function(req, res, next){
        if(req.result === undefined){
            req.result = {};
        }
        req.result.usage = [
            '/{API version}/{categroy}',
            'example 3 > /010000/current?key={key}&code={lat},{lon}&country={country_name}&city={city_name}'
        ];

        next();
    };

    /**
     *
     * @param req
     * @param res
     * @param next
     */
    self.checkApiVersion = function(req, res, next){
        var self = this;
        var meta = {};

        meta.method = 'checkApiVersion';
        meta.version = req.params.version;
        req.version = req.params.version;

        log.info(meta);

        // todo: To check all version and make way to alternate route.
        if(req.version !== '010000') {
            log.error('WW> It is not valid version :', req.version);
            req.validVersion = false;
            req.error = 'WW> It is not valid version : ' + req.version;
            next();
        }else{
            log.info('WW > go to next step');
            req.validVersion = true;
            next();
        }
    };

    /**
     *
     * @param req
     * @param res
     * @param next
     * @returns {*}
     */
    self.queryWeather = function(req, res, next){
        var meta = {};
        meta.method = 'queryWeather';

        if(!req.validVersion){
            log.error('WW> invalid version : ', req.validVersion);
            return next();
        }

        if(!self.isValidCategory(req)){
            return next();
        }

        self.getCode(req);
        self.getCountry(req);
        self.getCity(req);

        if(!req.geocode && !req.city){
            log.error('It is not valid request');
            req.error = 'It is not valid request';
            next();
            return;
        }

        log.info('geocode : ', req.geocode);

        async.waterfall([
                // 1. load geocode list, if it does not load geocode yet.
                function(callback){
                    if(self.geocodeList.length <= 0){
                        self.loadGeocodeList(function(err){
                            if(err){
                                req.error = err;
                                callback('err_exit');
                                return;
                            }
                            log.info('WW> load geocode, count:', self.geocodeList.length);
                            callback(null);
                        });
                    }else{
                        // goto next step
                        callback(null);
                    }
                },
                // 2. check geocode if it is in the geocodelist or not.
                function(callback){
                    if(req.city !== undefined && self.checkCityName(req.city)){
                        log.info('WW> matched by city name');
                        callback(null);
                        return;
                    }

                    if(req.geocode !== undefined && self.checkGeocode(req.geocode)){
                        log.info('WW> matched by geocode');
                        callback(null);
                        return;
                    }

                    // Need to send request to add this geocode.
                    req.error = 'WW> It is the fist request, will collect weather for this geocode :', req.geocode, req.city;
                    log.error(req.error);

                    self.requestAddingGeocode(req, function(err, result){
                        if(err){
                            log.error('WW> fail to reqeust');
                            req.error = {res: 'fail', msg:'this is the first request of geocode'};
                            callback('err_exit : Fail to requestAddingGeocode()');
                            return;
                        }

                        // need to update location list
                        // TODO : Perhaps it'll take for long time, so need to find out other way to update.
                        self.loadGeocodeList(function(err){
                            if(err){
                                log.error('WW> Fail to update geocode list, count:', self.geocodeList.length);
                            }else{
                                log.silly('WW> update geocode list, count:', self.geocodeList.length);
                            }

                            req.error = undefined;

                            callback(null);
                        });
                    });
                },
                // 3. get MET data from DB by using geocode.
                function(callback){
                    self.getDataFromMET(req, function(err){
                        log.info('WW> get MET data');

                        // goto next step
                        callback(null);
                    });
                },
                // 4. get OWM data from DB by using geocode
                function(callback){
                    self.getDataFromOWM(req, function(err){
                        log.info('WW> get OWM data');

                        // goto next step
                        callback(null);
                    });
                },
                // 5. get WU data from DB by using geocode
                function(callback){
                    self.getDataFromWU(req, function(err, result){
                        if(err){
                            log.error('WW> Fail to get WU data: ', err);
                            callback(null);
                            return;
                        }
                        log.info('WW> get WU data');

                        // goto next step
                        callback(null);
                    });
                },
                // 6. get DSF data from DB by using geocode.
                function(callback){
                    self.getDataFromDSF(req, function(err, result){
                        if(err){
                            log.error('WW> Fail to get DSF data', err);
                            callback(null);
                            return;
                        }
                        log.info('WW> get DSF data');

                        // goto next step
                        callback(null);
                    });
                }
        ],
        function(err, result){
            if(err){
                log.info('WW> queryWeather Error : ', err);
            }else{
                log.silly('WW> queryWeather no error')
            }

            log.info('WW> Finish to make weather data');
            next();
        });
    };

    /**
     *
     * @param req
     * @param res
     * @param next
     */
    self.checkCommand = function(req, res, next){
        if(req.query.command === undefined){
            next();
            return;
        }

        switch(req.query.command){
            case 'restart':
                next();
                break;
            case 'renew_geocode_list':
                self.loadGeocodeList(req, function(err){
                    if(err){
                        req.error = err;
                    }
                    next();
                });
                break;
            default:
                log.error('WW> unknown command :' + req.query.command);
                next();
                break;
        }
    };


    self.mergeWuForecastData = function(req, res, next){
        if(req.WU.forecast){
            if(req.result === undefined){
                req.result = {};
            }
            var forecast = req.WU.forecast;

            // Merge WU Forecast DATA
            if(forecast.geocode){
                req.result.location = {};
                if(forecast.geocode.lat){
                    req.result.location.lat = forecast.geocode.lat;
                }
                if(forecast.geocode.lon){
                    req.result.location.lon = forecast.geocode.lon;
                }
            }

            if(forecast.date){
                req.result.pubDate = {};

                if(forecast.date){
                    req.result.pubDate.wuForecast = forecast.date;
                }
            }
            if(forecast.dateObj){
                if(req.result.pubDate === undefined){
                    req.result.pubDate = {};
                }

                if(forecast.dateObj){
                    req.result.pubDate.wuForecast = forecast.dateObj;
                }
            }

            if(forecast.days){
                if(req.result.daily === undefined){
                    req.result.daily = [];
                }
                forecast.days.forEach(function(item){
                    req.result.daily.push(self._makeDailyDataFromWU(item.summary));

                    if(req.result.timely === undefined){
                        req.result.timely = [];
                    }

                    item.forecast.forEach(function(time){
                        var index = -1;

                        for(var i=0 ; i<req.result.timely.length ; i++){
                            if((req.result.timely[i].date === time.dateObj)
                                || req.result.timely[i].date === ('' + time.date + time.time)){
                                index = i;
                                break;
                            }
                        }

                        if(index > 0){
                            req.result.timely[i] = self._makeTimelyDataFromWU(time);
                        }
                        else{
                            req.result.timely.push(self._makeTimelyDataFromWU(time));
                        }
                    });
                });
            }
        }

        next();
    };

    self.mergeWuCurrentData = function(req, res, next){
        if(req.WU.current){
            var list = req.WU.current.dataList;
            var curDate = new Date();
            log.info('MG WuC> curDate ', curDate);

            if(req.result.timely === undefined){
                req.result.timely = [];
            }
            list.forEach(function(curItem){
                var isExist = 0;
                if(curItem.dateObj && curItem.dateObj > curDate){
                    log.info('MG WuC> skip future data', curItem.dateObj);
                    return;
                }

                for(var i=0 ; i<req.result.timely.length ; i++){
                    if(req.result.timely[i].dateObj === curItem.dateObj){
                        isExist = 1;
                        if(curItem.desc){
                            req.result.timely[i].desc = curItem.desc;
                        }
                        if(curItem.temp){
                            req.result.timely[i].temp_c = curItem.temp;
                        }
                        if(curItem.temp_f){
                            req.result.timely[i].temp_f = curItem.temp_f;
                        }
                        if(curItem.ftemp){
                            req.result.timely[i].ftemp_c = curItem.ftemp;
                        }
                        if(curItem.ftemp_f){
                            req.result.timely[i].ftemp_f = curItem.ftemp_f;
                        }
                        if(curItem.humid){
                            req.result.timely[i].humid = curItem.humid;
                        }
                        if(curItem.windspd){
                            req.result.timely[i].windSpd_ms = curItem.windspd;
                        }
                        if(curItem.windspd_mh){
                            req.result.timely[i].windSpd_mh = curItem.windspd_mh;
                        }
                        if(curItem.winddir){
                            req.result.timely[i].windDir = curItem.winddir;
                        }
                        if(curItem.cloud){
                            req.result.timely[i].cloud = curItem.cloud;
                        }
                        if(curItem.vis){
                            req.result.timely[i].vis = curItem.vis;
                        }
                        if(curItem.slp){
                            req.result.timely[i].press = curItem.slp;
                        }
                    }
                }
                if(isExist === 0){
                    req.result.timely.push(self._makeTimelyDataFromWUCurrent(curItem));
                }

            });
        }
        next();
    };

    self.mergeDsfData = function(req, res, next){
        if(req.DSF){
            if(req.result === undefined){
                req.result = {};
            }

            //req.result.DSF = req.DSF;
        }
        next();
    };

    /*******************************************************************************
     * * ***************************************************************************
     * * Private Functions (For internal)
     * * ***************************************************************************
     * *****************************************************************************/

    self._getDatabyDate = function(list, date){
        list.forEach(function(item, index){
            if(item.date === date){

            }
        })
    };

    self._makeTimelyDataFromWUCurrent = function(time){
        var result = {};

        if(time.date){
            result.date = time.date;
        }
        if(time.dateObj){
            result.date = time.dateObj;
        }
        if(time.desc){
            result.desc = time.desc;
        }
        if(time.temp){
            result.temp_c = time.temp;
        }
        if(time.temp_f){
            result.temp_f = time.temp_f;
        }
        if(time.ftemp){
            result.ftemp_c = time.ftemp;
        }
        if(time.ftemp_f){
            result.ftemp_f = time.ftemp_f;
        }
        if(time.humid){
            result.humid = time.humid;
        }
        if(time.windspd){
            result.windSpd_ms = time.windspd;
        }
        if(time.windspd_mh){
            result.windSpd_mh = time.windspd_mh;
        }
        if(time.winddir){
            result.windDir = time.winddir;
        }
        if(time.cloud){
            result.cloud = time.cloud;
        }
        if(time.vis){
            result.vis = time.vis;
        }
        if(time.slp){
            result.press = time.slp;
        }

        return result;
    };

    self._makeTimelyDataFromWU = function(time){
        var result = {};

        if(time.date && time.time){
            result.date = '' + time.date + time.time;
        }
        if(time.utcDate && time.utcTime){
            result.date = '' + time.date + time.time;
        }
        if(time.dateObj){
            result.date = time.dateObj;
        }
        if(time.tmp){
            result.temp_c = time.tmp;
        }
        if(time.tmp_f){
            result.temp_f = time.tmp_f
        }
        if(time.ftmp){
            result.ftemp_c = time.ftmp;
        }
        if(time.ftmp_f){
            result.ftemp_f = time.ftmp_f;
        }
        if(time.cloudtot){
            result.cloud = time.cloudtot;
        }
        if(time.windspd){
            result.windSpd_ms = time.windspd;
        }
        if(time.windspd_mh){
            result.windSpd_mh = time.windspd_mh;
        }
        if(time.winddir){
            result.windDir = time.winddir;
        }
        if(time.humid){
            result.humid = time.humid;
        }
        result.precType = 0;
        if(time.rain > 0){
            result.precType += 1;
        }
        if(time.snow > 0){
            result.precType += 2;
        }
        if(time.prob){
            result.precProb = time.prob;
        }
        if(time.precip){
            result.precip = time.precip;
        }
        if(time.vis){
            result.vis = time.vis;
        }
        if(time.splmax){
            result.press = time.splmax;
        }

        return result;
    };
    self._makeDailyDataFromWU = function(summary){
        var day = {};

        if(summary.date){
            day.date = summary.date;
        }
        if(summary.dateObj){
            day.date = summary.dateObj;
        }
        if(summary.desc){
            day.desc = summary.desc;
        }
        if(summary.sunrise){
            day.sunrise = summary.sunrise;
        }
        if(summary.sunset){
            day.sunset = summary.sunset;
        }
        if(summary.moonrise){
            day.moonrise = summary.moonrise;
        }
        if(summary.moonset){
            day.moonset = summary.moonset;
        }
        if(summary.tmax){
            day.tempMax_c = summary.tmax;
        }
        if(summary.tmax_f){
            day.tempMax_f = summary.tmax_f;
        }
        if(summary.tmin){
            day.tempMin_c = summary.tmin;
        }
        if(summary.tmin_f){
            day.tempMin_f = summary.tmin_f;
        }
        if(summary.ftmax){
            day.ftempMax_c = summary.ftmax;
        }
        if(summary.ftmax_f){
            day.ftempMax_f = summary.ftmax_f;
        }
        if(summary.ftmin){
            day.ftempMin_c = summary.ftmin;
        }
        if(summary.ftmin_f){
            day.ftempMin_f = summary.ftmon_f;
        }

        day.precType = 0;
        if(summary.rain > 0){
            day.precType += 1;
        }
        if(summary.snow > 0){
            day.precType += 2;
        }

        if(summary.prob){
            day.precProb = summary.prob;
        }
        if(summary.humax){
            day.humid = summary.humax;
        }
        if(summary.windspdmax){
            day.windSpd_ms = summary.windspdmax;
        }
        if(summary.windspdmax_mh){
            day.windSpd_mh = summary.windspdmax_mh;
        }
        if(summary.slpmax){
            day.press = summary.slpmax;
        }

        return day;
    };
    /**
     *
     * @param req
     * @returns {boolean}
     */
    self.isValidCategory = function(req){
        if(req.params.category === undefined){
            log.error('there is no category');
            return false;
        }

        for(var i in weatherCategory){
            if(weatherCategory[i] === req.params.category){
                return true;
            }
        }

        return false;
    };

    /**
     *
     * @param req
     * @returns {boolean}
     */
    self.getCode = function(req){
        if(req.query.gcode === undefined){
            log.silly('WW> can not find geocode from qurey');
            return false;
        }

        var geocode = req.query.gcode.split(',');
        if(geocode.length !== 2){
            log.error('WW> wrong goecode : ', geocode);
            req.error = 'WW> wrong geocode : ' + geocode;
            return false;
        }

        req.geocode = {lat:geocode[0], lon:geocode[1]};

        return true;
    };

    /**
     *
     * @param req
     * @returns {boolean}
     */
    self.getCountry = function(req){
        if(req.query.country === undefined){
            log.silly('WW> can not find country name from qurey');
            return false;
        }

        req.country = req.query.country;

        return true;
    };

    /**
     *
     * @param req
     * @returns {boolean}
     */
    self.getCity = function(req){
        if(req.query.city === undefined){
            log.silly('WW> can not find city name from qurey');
            return false;
        }

        req.city = req.query.city;

        return true;
    };

    /**
     *
     * @param callback
     */
    self.loadGeocodeList = function(callback){
        log.silly('WW> IN loadGeocodeList');

        try{
            modelGeocode.find({}, {_id:0}).lean().exec(function (err, tList){
                if(err){
                    log.error('WW> Can not found geocode:', + err);
                    callback(new Error('WW> Can not found geocode:', + err));
                    return;
                }

                //if(tList.length <= 0){
                //    log.error('WW> There are no geocode in the DB');
                //    callback(new Error('WW> There are no geocode in the DB'));
                //    return;
                //}

                self.geocodeList = tList;
                log.info('WW> ', JSON.stringify(self.geocodeList));
                callback(0);
            });
        }
        catch(e){
            callback(new Error('WW> catch exception when loading geocode list from DB'));
        }
    };

    /**
     *
     * @param city
     * @returns {boolean}
     */
    self.checkCityName = function(city){
        for(var i = 0; i < self.geocodeList.length ; i++){
            if(self.geocodeList[i].address.city === city){
                return true;
            }
        }

        return false;
    };

    /**
     *
     * @param geocode
     * @returns {boolean}
     */
    self.checkGeocode = function(geocode){
        for(var i = 0; i < self.geocodeList.length ; i++){
            log.info('index[' + i + ']' + 'lon:(' + self.geocodeList[i].geocode.lon + '), lat:(' + self.geocodeList[i].geocode.lat + ') | lon:(' + geocode.lon + '), lat:(' + geocode.lat + ')');
            if((self.geocodeList[i].geocode.lon === parseFloat(geocode.lon)) &&
                (self.geocodeList[i].geocode.lat === parseFloat(geocode.lat))){
                return true;
            }
        }

        return false;
    };

    /**
     *
     * @param req
     * @param callback
     */
    self.getDataFromMET = function(req, callback){
        req.MET = {};
        callback(0, req.MET);
    };

    /**
     *
     * @param req
     * @param callback
     */
    self.getDataFromOWM = function(req, callback){
        req.OWM = {};
        callback(0, req.OWM);
    };

    self.getWuForecastData = function(days){
        var result = [];

        days.forEach(function(day){
            var newItem = {
                summary:{},
                forecast: []
            };
            itemWuForecastSummary.forEach(function(summaryItem){
                if(day.summary[summaryItem]){
                    newItem.summary[summaryItem] = day.summary[summaryItem];
                }
            });

            day.forecast.forEach(function(forecastItem){
                var newForecast = {};

                itemWuForecast.forEach(function(name){
                    if(forecastItem[name]){
                        newForecast[name] = forecastItem[name];
                    }
                });

                newItem.forecast.push(newForecast);
            });

            newItem.forecast.sort(function(a, b){
                if(a.time > b.time){
                    return 1;
                }
                if(a.time < b.time){
                    return -1;
                }
                return 0;
            });

            result.push(newItem);
        });

        result.sort(function(a, b){
            if(a.summary.date > b.summary.date){
                return 1;
            }
            if(a.summary.date < b.summary.date){
                return -1;
            }
            return 0;
        });

        return result;
    };

    self.getWuCurrentData = function(dataList){
        var result = [];

        dataList.forEach(function(item){
            var newData = {};
            itemWuCurrent.forEach(function(name){
                newData[name] = item[name];
            });
            result.push(newData);
        });

        return result;
    };

    /**
     *
     * @param req
     * @param callback
     */
    self.getDataFromWU = function(req, callback){
        var geocode = {
            lat: parseFloat(req.geocode.lat),
            lon: parseFloat(req.geocode.lon)
        };

        var res = {
            current:{},
            forecast: {}
        };

        async.parallel([
                function(cb){
                    modelWuCurrent.find({geocode:geocode}, function(err, list){
                        if(err){
                            log.error('gWU> fail to get WU Current data');
                            //cb(new Error('gFU> fail to get WU Current data'));
                            cb(null);
                            return;
                        }

                        if(list.length === 0){
                            log.error('gWU> There is no WU Current data for ', geocode);
                            //cb(new Error('gFU> There is no WU Current data'));
                            cb(null);
                            return;
                        }

                        res.current = list[0];
                        cb(null);
                    });
                },
                function(cb){
                    modelWuForecast.find({geocode:geocode}, function(err, list){
                        if(err){
                            log.error('gWU> fail to get WU Forecast data');
                            //cb(new Error('gFU> fail to get WU Forecast data'));
                            cb(null);
                            return;
                        }

                        if(list.length === 0){
                            log.error('gWU> There is no WU Forecast data for ', geocode);
                            //cb(new Error('gFU> There is no WU Forecast data'));
                            cb(null);
                            return;
                        }

                        res.forecast = list[0];
                        cb(null);
                    });
                }
            ],
            function(err, result){
                if(err){
                    log.error('gWU> something is wrong???');
                    return;
                }

                req.WU = {};
                req.WU.current = res.current;
                req.WU.forecast = res.forecast;

                callback(err, req.WU);
            }
        );
    };

    self.getDataFromDSF = function(req, callback){
        var geocode = {
            lat: parseFloat(req.geocode.lat),
            lon: parseFloat(req.geocode.lon)
        };

        modelDSForecast.find({geocode:geocode}, function(err, list){
            if(err){
                log.error('gDSF> fail to get DSF data');
                callback(err);
                return;
            }

            if(list.length === 0){
                log.error('gDSF> There is no DSF data for ', geocode);
                callback(err);
                return;
            }

            req.DSF = list[0];

            callback(err, req.DSF);
        });
    };

    /**
     *
     * @param req
     */
    self.makeDefault = function(req){
        req.result = {};
    };

    /**
     *
     * @param req
     */
    self.mergeWeather = function(req){
        if(req.MET){
            // TODO : merge MET data
        }

        if(req.OWM){
            // TODO : merge OWM data
        }

        if(req.WU){
            // TODO : merge WU data
            req.result.WU = req.WU;
        }

        if(req.DSF){
            req.result.DSF = req.DSF;
        }
    };

    /**
     *
     * @param req
     * @param callback
     */
    self.requestAddingGeocode = function(req, callback){
        var base_url = config.url.requester;
        var key = 'abcdefg';

        var url = base_url + 'req/ALL/req_add?key=' + key;

        if(req.geocode){
            url += '&gcode=' + req.geocode.lat + ',' + req.geocode.lon;
        }

        if(req.country){
            url += '&country=' + req.country;
        }

        if(req.city){
            url += '&city=' + req.city;
        }

        log.info('WW> req url : ', url);
        try{
            request.get(url, {timeout: 1000 * 20}, function(err, response, body){
                if(err){
                    log.error('WW> Fail to request adding geocode to db');
                    callback(err);
                    return;
                }

                var result = JSON.parse(body);
                log.silly('WW> request success');
                log.silly(result);
                if(result.status == 'OK'){
                    // adding geocode OK
                    callback(0, result);
                }else{
                    callback(new Error('fail(receive fail message from requester'));
                }
            });
        }
        catch(e){
            callback(new Error('WW> something wrong!'));
        }
    };

    return self;
}

module.exports = controllerWorldWeather;