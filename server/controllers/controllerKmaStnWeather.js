/**
 * Created by aleckim on 2016. 4. 4..
 */

'use strict';

var async = require('async');

var KmaStnDaily = require('../models/modelKmaStnDaily');
var KmaStnHourly = require('../models/modelKmaStnHourly');
var KmaStnMinute = require('../models/modelKmaStnMinute');
var KmaStnInfo = require('../models/modelKmaStnInfo');
var kmaTimeLib = require('../lib/kmaTimeLib');

var Scrape = require('../lib/kmaScraper');

function controllerKmaStnWeather() {

}

/**
 * weather, r1d, s1d는 발생시에만 있고, sensoryTem과 dspls는 둘중 하나만 있음
 * 도시별날씨의 경우 바로 적용.
 * 매분 가지고 오는 경우에 강수(rns)도 산이랑 구분하는 게 맞는건지 잘 모르겠음.
 * @param stnWeatherList
 * @param t1h
 * @returns {*}
 * @private
 */
controllerKmaStnWeather._mergeStnWeatherList = function (stnWeatherList, t1h) {
    var propertyName = ['stnId', 'stnName', 'weather', 'visibility', 'cloud', 'heavyCloud', 't1h', 'dpt', 'sensoryTem', 'dspls',
                        'r1d', 's1d', 'reh', 'wdd', 'vec', 'wsd', 'hPa', 'rs1h', 'rs1d', 'rns'];
    var propertyCount = 0;
    var mergedStnWeatherInfo;

    for (var j=0; j<stnWeatherList.length; j++) {
        var stnWeatherInfo = stnWeatherList[j];

        for (var i=2; i<propertyName.length; i++) {
            if (stnWeatherInfo[propertyName[i]] != undefined) {
                if (mergedStnWeatherInfo && mergedStnWeatherInfo[propertyName[i]] != undefined) {
                    log.silly('it already has property, skip property=', propertyName[i]);
                    continue;
                }
                if (mergedStnWeatherInfo == undefined) {
                    mergedStnWeatherInfo = {stnId: stnWeatherInfo.stnId, stnName: stnWeatherInfo.stnName};
                    propertyCount = 2;
                }
                mergedStnWeatherInfo[propertyName[i]] = stnWeatherInfo[propertyName[i]];
                if (mergedStnWeatherInfo.stnId != stnWeatherInfo.stnId) {
                    mergedStnWeatherInfo[propertyName[i]+'Stn'] = stnWeatherInfo.stnName;
                }
                propertyCount++;
                if (propertyName.length == propertyCount) {
                    return mergedStnWeatherInfo;
                }
            }
        }
    }

    if (mergedStnWeatherInfo == undefined) {
        log.error('Fail to make stnWeather info');
        return;
    }
    log.verbose('get data of stn weather info count=', propertyCount);
    return mergedStnWeatherInfo;
};

controllerKmaStnWeather._getStnMinuteList = function (stnList, dateTime, callback) {
    var self = this;

    if (!Array.isArray(stnList)) {
        callback(new Error("mstStnList is not array"));
        return this;
    }

    async.mapSeries(stnList,
        function (stnInfo, mCallback) {
            KmaStnMinute.find({stnId: stnInfo.stnId}, {_id: 0}).lean().exec(function (err, stnWeatherList) {
                if (err) {
                    log.error(err);
                    return mCallback();
                }
                if (stnWeatherList.length === 0) {
                    log.error('Fail to find stn Weather info of stnName=', stnInfo.stnName);
                    return mCallback();
                }

                if (stnWeatherList.length > 1) {
                    log.error('stn weather info is duplicated stnName=', stnInfo.stnName);
                }

                if (!stnWeatherList[0].pubDate) {
                    log.warn('It does not have any data stnName=', stnInfo.stnName);
                    return mCallback();
                }

                //20min - data자체가 3분정도 딜레이가 있음.
                var limitTime = (new Date(dateTime)).getTime()-1200000;

                //log.info(dateTime);
                //log.info(stnWeatherList[0].pubDate);
                if ((new Date(stnWeatherList[0].pubDate)).getTime() < limitTime) {
                    log.warn('It was not updated yet pubDate=',stnWeatherList[0].pubDate,' stnId=',stnInfo.stnId,' stnName=', stnInfo.stnName);
                    return mCallback();
                }

                var minuteList = stnWeatherList[0].minuteData.filter(function (data) {
                    if ((new Date(data.date)).getTime() > limitTime) {
                        return true;
                    }
                    return false;
                });

                var minuteData = minuteList[minuteList.length-1];
                if (minuteData == undefined) {
                    log.error('It does not have data pubDate=', dateTime, ' stnName=', stnInfo.stnName);
                    return mCallback();
                }

                //if (self._checkRnsWork(stnInfo.stnId) != true) {
                var rnsHitRate = stnInfo.rnsHit/stnInfo.rnsCount;

                if (rnsHitRate < 0.5) {
                    //log.warn("rns is not working stnId="+stnInfo.stnId+" stnName="+
                    //            stnInfo.stnName+" rns hit ratio="+rnsHitRate);
                    minuteData.rns = undefined;
                }

                //log.info("minuteList length="+minuteList.length);
                if (minuteData.rns != undefined && minuteList.length >= 5) {
                    //limtTime안에 rain이 하나라도 true이면 rain임.
                    for (var i=0; i < minuteList.length; i++) {
                        if (minuteList[i].rns) {
                            minuteData.rns = true;
                            break;
                        }
                    }
                    if (i === minuteList.length) {
                        minuteData.rns = false;
                    }
                }

                var stnWeatherInfo = JSON.parse(JSON.stringify(minuteData));
                stnWeatherInfo.stnId = stnInfo.stnId;
                stnWeatherInfo.stnName = stnInfo.stnName;
                stnWeatherInfo.isCityWeather =  stnInfo.isCityWeather?true:false;

                mCallback(err, stnWeatherInfo);
            });
        },
        function (err, results) {
            if (err) {
                return callback(err);
            }
            results = results.filter(function (data) {
                return !!data;
            });
            callback(err, results);
        }
    );
};

/**
 *
 * @param stnList
 * @param dateTime
 * @param callback
 * @returns {controllerKmaStnWeather}
 * @private
 */
controllerKmaStnWeather._getStnHourlyList = function (stnList, dateTime, callback) {
    if (!Array.isArray(stnList)) {
        callback(new Error("mstStnList is not array"));
        return this;
    }

    //순서를 위해서 mapSeries를 사용
    async.mapSeries(stnList, function (stnInfo, mCallback) {
       KmaStnHourly.find({stnId: stnInfo.stnId}).lean().exec(function (err, stnWeatherList) {
           if (err) {
               log.error(err);
               //it will removed
               return mCallback();
           }
           if (stnWeatherList.length === 0) {
               log.error('Fail to find stn Weather info of stnName=', stnInfo.stnName);
               return mCallback();
           }

           if (stnWeatherList.length > 1) {
               log.error('stn weather info is duplicated stnName=', stnInfo.stnName);
           }

           if (!stnWeatherList[0].pubDate) {
               log.warn('It does not have any data stnName=', stnInfo.stnName);
               return mCallback();
           }

           if ((new Date(stnWeatherList[0].pubDate)).getTime()+3600000 < (new Date(dateTime)).getTime()) {
               log.warn('It was not updated yet pubDate=',stnWeatherList[0].pubDate,' stnName=', stnInfo.stnName);
               return mCallback();
           }

           var hourlyData = stnWeatherList[0].hourlyData[0];

           //for (var i=stnWeatherList[0].hourlyData.length-1; i>=0; i--) {
           //    if (stnWeatherList[0].hourlyData[i].date === dateTime) {
           //        hourlyData = stnWeatherList[0].hourlyData[i];
           //        break;
           //    }
           //}

           if (hourlyData == undefined) {
               log.error('It does not have data pubDate=', dateTime, ' stnName=', stnInfo.stnName);
               return mCallback();
           }

           var stnWeatherInfo = JSON.parse(JSON.stringify(hourlyData));
           stnWeatherInfo.stnId = stnInfo.stnId;
           stnWeatherInfo.stnName = stnInfo.stnName;
           stnWeatherInfo.isCityWeather =  stnInfo.isCityWeather?true:false;

           mCallback(err, stnWeatherInfo);
       });
    }, function (err, results) {
        if (err)  {
            return callback(err);
        }
        results = results.filter(function (data) {
            return !!data;
        });
        callback(err, results);
    });

    return this;
};

/**
 * 사용할 stn를 선정한다. 산 등 고도가 주변지역보다 너무 차이 나는 경우 제외.
 * @param stnList
 * @returns {*}
 * @private
 */
controllerKmaStnWeather._filterStnList = function (stnList) {
    return stnList.filter(function (stn) {
        if (stn.isMountain == undefined) {
            return true;
        }
        if (stn.isCityWeather) return true;

        return !stn.isMountain;
    });
};

/**
 * KMA station은 시도별날씨 정보를 제공하는 곳과 아닌 곳이 있어서 두개 구분하고, 시도별날씨를 요청에 꼭 하나 넣도록 한다.
 * 근접한 측정소의 온도값이 다은 측정소보다 차가 크다면, 산이나 높은 고도에 있는 것으로 보고, 측정값을 제외한다.
 * @param townInfo
 * @param dateTime
 * @param t1h
 * @param callback
 * @returns {controllerKmaStnWeather}
 */
controllerKmaStnWeather.getStnHourly = function (townInfo, dateTime, t1h, callback) {
    var self = this;

    var stnDateTime = kmaTimeLib.convertYYYYMMDDHHMMtoYYYYoMMoDDoHHoMM(dateTime);

    async.waterfall([function (cb) {
        var coords = [townInfo.gCoord.lon, townInfo.gCoord.lat];
        async.parallel([function (pCallback) {
            KmaStnInfo.find({geo: {$near:coords, $maxDistance: 0.2}}).limit(5).lean().exec(function (err, kmaStnList) {
                if (err) {
                    return pCallback(err);
                }
                return pCallback(err, kmaStnList);
            });
        }, function (pCallback) {
            KmaStnInfo.find({geo: {$near:coords, $maxDistance: 0.2}, isCityWeather: true}).limit(1).lean().exec(function (err, kmaStnList) {
                if (err) {
                    return pCallback(err);
                }
                return pCallback(err, kmaStnList);
            });
        }], function (err, results) {
            if (err) {
                return cb(err);
            }
            var stnList = self._filterStnList(results[0].concat(results[1])) ;
            cb(err, stnList);
        });
    }, function (stnList, cb) {
        self._getStnHourlyList(stnList, stnDateTime, function (err, results) {
            if (err) {
                return cb(err);
            }
            cb(err, results);
        });
    }, function (stnHourWeatherList, cb) {
        var mergedStnWeather = self._mergeStnWeatherList(stnHourWeatherList, t1h);
        if (mergedStnWeather == undefined) {
            return cb(new Error('Fail to make stn Hourly Weather info town='+JSON.stringify(townInfo)));
        }
        else {
            mergedStnWeather.stnDateTime = stnHourWeatherList[0].date;
        }
        cb(undefined, mergedStnWeather);
    }], function (err, result) {
        if (err) {
            return callback(err);
        }
        callback(err, result);
    });

    return this;
};

/**
 * 매분 날씨 정보를 가지고 옴.
 * @param townInfo
 * @param dateTime
 * @param t1h
 * @param callback
 * @returns {controllerKmaStnWeather}
 */
controllerKmaStnWeather.getStnMinute = function (townInfo, dateTime, t1h, callback) {
    var self = this;

    var stnDateTime = kmaTimeLib.convertYYYYMMDDHHMMtoYYYYoMMoDDoHHoMM(dateTime);
    var coords = [townInfo.gCoord.lon, townInfo.gCoord.lat];

    async.waterfall([
            function (aCallback) {
                KmaStnInfo.find({geo: {$near:coords, $maxDistance: 0.2}}).limit(5).lean().exec(function (err, kmaStnList) {
                    if (err) {
                        return aCallback(err);
                    }

                    var stnList = self._filterStnList(kmaStnList) ;
                    return aCallback(err, stnList);
                });
            },
            function (stnList, aCallback) {
               self._getStnMinuteList(stnList, stnDateTime, function (err, results) {
                   if (err) {
                       return aCallback(err);
                   }
                   aCallback(err, results);
               })
            },
            function (stnMinuteWeatherList, aCallback) {
                var mergedStnWeather = self._mergeStnWeatherList(stnMinuteWeatherList, t1h);
                if (mergedStnWeather == undefined) {
                    return aCallback(new Error('Fail to make stn Minute Weather info town='+JSON.stringify(townInfo)));
                }
                else {
                    mergedStnWeather.stnDateTime = stnMinuteWeatherList[0].date;
                }
                aCallback(undefined, mergedStnWeather);
            }
        ],
        function (err, result) {
            if (err)  {
                return callback(err);
            }
            callback(err, result);
        });

    return this;
};

module.exports = controllerKmaStnWeather;
