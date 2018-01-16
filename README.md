# Spacer
Like a cross between TradeWars, Elite, The Expanse, and Firefly.

# Testing

## Chrome
    cordova platform add browser --usegit
    cordova plugin add cordova-plugin-browsersync
    cordova run browser -- --live-reload

## Android
    cordova platform add android
    cordova build android
    adb install /path/to/generated/apk

## iOS
    cordova run ios
