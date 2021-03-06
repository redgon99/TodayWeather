var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sh = require('shelljs');
var fs = require('fs');
var rmplugin = require('gulp-cordova-plugin-remove');

var shell = require('gulp-shell');

var json = JSON.parse(fs.readFileSync('./package.json'));

var paths = {
  sass: ['./scss/**/*.scss']
};

gulp.task('default', ['sass']);

gulp.task('sass', function(done) {
  gulp.src('./scss/ionic.app.scss')
    .pipe(sass({
      errLogToConsole: true
    }))
    .pipe(gulp.dest('./www/css/'))
    .pipe(minifyCss({
      keepSpecialComments: 0
    }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest('./www/css/'))
    .on('end', done);
});

gulp.task('watch', function() {
  gulp.watch(paths.sass, ['sass']);
});

gulp.task('install', ['git-check'], function() {
  return bower.commands.install()
    .on('log', function(data) {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    });
});

gulp.task('build', shell.task([
  'ionic state reset',
  'cp -a ../ios platforms/',
  'cp -a ../android platforms/',
  'ionic state restore --plugins',
  'npm install',
  'cd node_modules/cordova-uglify/;npm install',
  'bower install',
  'gulp sass',
  'ionic build'
]));

gulp.task('release', shell.task([
  'ionic state reset',
  'cp -a ../ios platforms/',
  'cp -a ../android platforms/',
  'ionic state restore --plugins',
  'npm install',
  'cd node_modules/cordova-uglify/;npm install',
  'bower install',
  'gulp sass',
  'ionic build --release'
]));

gulp.task('release-nonpaid', shell.task([
  'cp config-androidsdk19.xml config.xml',
  'cp ads.package.json package.json',
  'cp ads.onestore.tw.client.config.js www/tw.client.config.js',
  'ionic state reset',
  'cp -a ../android platforms/',
  'ionic state restore --plugins',
  'npm install',
  'cd node_modules/cordova-uglify/;npm install',
  'bower install',
  'gulp sass',
  'ionic build android --release',
  'cp platforms/android/build/outputs/apk/android-release-unsigned.apk ./',
  'jarsigner -tsa http://timestamp.digicert.com -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore wizardfactory-release-key.keystore android-release-unsigned.apk wizardfactoryreleasekey -storepass wzd2014',
  '~/Library/Android/sdk/build-tools/23.0.1/zipalign -v 4 android-release-unsigned.apk TodayWeather_ads_onestore_v'+json.version+'_min19.apk',

  'cp ads.ios_playstore.tw.client.config.js www/tw.client.config.js',
  'cordova plugin add cordova-plugin-inapppurchase',
  'ionic build android --release',
  'cp platforms/android/build/outputs/apk/android-release-unsigned.apk ./',
  'jarsigner -tsa http://timestamp.digicert.com -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore wizardfactory-release-key.keystore android-release-unsigned.apk wizardfactoryreleasekey -storepass wzd2014',
  '~/Library/Android/sdk/build-tools/23.0.1/zipalign -v 4 android-release-unsigned.apk TodayWeather_ads_playstore_v'+json.version+'_min19.apk',

  'cp config-androidsdk14.xml config.xml',
  'cordova plugin add cordova-plugin-crosswalk-webview@1.8.0',
  'ionic build android --release',
  'cp platforms/android/build/outputs/apk/android-armv7-release-unsigned.apk ./',
  'jarsigner -tsa http://timestamp.digicert.com -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore wizardfactory-release-key.keystore android-armv7-release-unsigned.apk wizardfactoryreleasekey -storepass wzd2014',
  '~/Library/Android/sdk/build-tools/23.0.1/zipalign -v 4 android-armv7-release-unsigned.apk TodayWeather_ads_playstore_v'+json.version+'_min14.apk',

  'cp -a ../ios platforms/',
  'ionic build ios --release',
  //'xcodebuild -project TodayWeather.xcodeproj -scheme TodayWeather -configuration Release clean archive'
  //'xcodebuild -exportArchive -archivePath ~/Library/Developer/Xcode/Archives/2016-10-27/TodayWeather\ 2016.\ 10.\ 27.\ 13.48.xcarchive -exportPath TodayWeather.ipa''
  //'/Applications/Xcode.app/Contents/Applications/Application\ Loader.app/Contents/Frameworks/ITunesSoftwareService.framework/Versions/A/Support/altool --validate-app -f TodayWeather.ipa -u kimalec7@gmail.com'
  //'/Applications/Xcode.app/Contents/Applications/Application\ Loader.app/Contents/Frameworks/ITunesSoftwareService.framework/Versions/A/Support/altool --upload-app -f TodayWeather.ipa -u kimalec7@gmail.com'
]));

/**
 * it does not works perfectly
 */
gulp.task('rmplugins', function () {
  var pluginList = json.cordovaPlugins;
  pluginList = pluginList.map(function (plugin) {
    if (typeof plugin === 'string') {
      return plugin;
    }
    else {
      if (plugin.hasOwnProperty('id')) {
        return plugin.id;
      }
    }
  });
  console.log(pluginList);
  return gulp.src('./').pipe(rmplugin(pluginList));
});

gulp.task('git-check', function(done) {
  if (!sh.which('git')) {
    console.log(
      '  ' + gutil.colors.red('Git is not installed.'),
      '\n  Git, the version control system, is required to download Ionic.',
      '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
      '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
    );
    process.exit(1);
  }
  done();
});
