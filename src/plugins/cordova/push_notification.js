/**
 * -------------
 * Dependency plugins:
 * -------------
 * - https://github.com/phonegap-build/PushPlugin
 * - https://github.com/apache/cordova-plugin-device
 * - https://github.com/danmichaelo/cordova-plugin-appinfo
 */

/**
 * @class Hook.Plugin.Cordova.PushNotification
 * @extends Hook.Events
 */
Hook.Plugin.Cordova.PushNotification = function(client) {
  var self = this;

  this.client = client;
  this.appVersion = "";

  if (!navigator.appInfo) {
    throw new Error("Please install AppInfo plugin: https://github.com/danmichaelo/cordova-plugin-appinfo");
  }

  // store appName from device
  navigator.appInfo.getVersion(function(version) {
    console.log("app version: " + version);
    self.appVersion = version;
  });
};

// Inherits from Events
Hook.Plugin.Cordova.PushNotification.prototype = new Hook.Events();
Hook.Plugin.Cordova.PushNotification.constructor = Hook.Plugin.Cordova.PushNotification;

// References:
// http://androidexample.com/Android_Push_Notifications_using_Google_Cloud_Messaging_GCM/index.php?view=article_discription&aid=119&aaid=139
// http://www.androidhive.info/2012/10/android-push-notifications-using-google-cloud-messaging-gcm-php-and-mysql/
// http://devgirl.org/2012/10/25/tutorial-android-push-notifications-with-phonegap/
// http://devgirl.org/2012/10/19/tutorial-apple-push-notifications-with-phonegap-part-1/

/**
 * Register device for Push Notifications
 * @method register
 * @return Hook.Plugin.Cordova.PushNotification
 *
 * @example Registering for push notifications on Android
 *
 *     //
 *     // Get a senderID on your app's Google Console
 *     // - https://developers.google.com/console
 *     //
 *     dl.cordova.push.register({senderID: "xxxx"}).on('notification', function(e) {
 *       console.log("Notification: ", e);
 *     });
 *
 * @example Registering for push notifications on iOS
 *
 *     dl.cordova.push.register().on('notification', function(e) {
 *       console.log("Notification: ", e);
 *     });
 */
Hook.Plugin.Cordova.PushNotification.prototype.register = function(options) {
  var self = this,
      name  = null,
      registerOptions = {
        ecb: 'onNotification',
        badge: "true", sound: "true", alert: "true" // iOS options
      },
      notificationPlugin = window.plugins && window.plugins.pushNotification;

  console.log("Registering for push notifications...");

  if (!notificationPlugin) {
    console.log("Please install PushPlugin: https://github.com/phonegap-build/PushPlugin");
    throw new Error("Please install PushPlugin: https://github.com/phonegap-build/PushPlugin");
  }

  if (typeof(device)==="undefined") {
    console.log("Please install device: https://github.com/apache/cordova-plugin-device");
    throw new Error("Please install device: https://github.com/apache/cordova-plugin-device");
  }

  console.log("Platform: " + device.platform);

  if (device.platform.match(/android/i) || device.platform.match(/fireos/)) {
    // senderID is required for Android/FireOS
    if (!options.senderID) {
      throw new Error("senderID is required for Android apps. Create one at: https://developers.google.com/console");
    }
  }

  // Merge options and registerOptions
  for (name in options) {
    if (options.hasOwnProperty(name)) {
      registerOptions[name] = options[name];
    }
  }

  // Ignore senderID for iOS devices
  if (device.platform.match(/ios/i)) {
    delete registerOptions['senderID'];
  } else {
    // ignore iOS-only options when it doens't apply
    delete registerOptions['badge'];
    delete registerOptions['sound'];
    delete registerOptions['alert'];
  }

  // Check 'regid' for Android registrations
  this.on('registered', function(e) {
    if ( e.regid.length > 0 ) {
      self._registerDevice(e.regid);
    }
  });

  function successHandler(result) {
    console.log("successHandler");
    // on iOS devices, result is the token
    if (device.platform.match(/ios/i)) {
      self._registerDevice(result);
    }
  }

  function errorHandler(error) {
    console.log("errorHandler");
    console.log("Error: " + error);
  }

  // Handle notification
  function onNotification(e) {
    // trigger generic notification
    self.trigger('notification', e);

    if (device.platform.match(/ios/i)) {
      if (e.alert) {
        navigator.notification.alert(e.alert);
      }

      if (e.sound) {
        var snd = new Media(e.sound);
        snd.play();
      }

      if (e.badge) {
        notificationPlugin.setApplicationIconBadgeNumber(successHandler, e.badge);
      }

      return;
    }

    // trigger event
    if (e.event) {
      self.trigger(event, e);
    }

    if (e.event == "message") {
      // if this flag is set, this notification happened while we were in the foreground.
      // you might want to play a sound to get the user's attention, throw up a dialog, etc.
      if (e.foreground) {
        // on Android soundname is outside the payload.
        // On Amazon FireOS all custom attributes are contained within payload
        var soundfile = e.soundname || e.payload.sound;
        // if the notification contains a soundname, play it.
        var my_media = new Media("/android_asset/www/"+ soundfile);

        my_media.play();

      } else {

        // otherwise we were launched because the user touched a notification in the notification tray.
        if (e.coldstart) {
          // COLDSTART NOTIFICATION
        } else {
          // BACKGROUND NOTIFICATION
        }
      }

      // e.payload.message

      // (android only)
      // e.payload.msgcnt

      // (amazon-fireos only)
      // e.payload.timeStamp
    }

  }

  // Android options
  // {"senderID":"1013943151641","ecb":"onNotification"}

  // iOS options
  // {"badge":"true","sound":"true","alert":"true","ecb":"onNotificationAPN"}

  console.log("will register for notifications...");
  console.log("options: " + JSON.stringify(registerOptions));

  // required
  notificationPlugin.register(successHandler, errorHandler, registerOptions);
  console.log("registered.");

  return this;
};

/**
 * Unregister device for Push Notifications
 * @method unregister
 */
Hook.Plugin.Cordova.PushNotification.prototype.unregister = function(options) {
};

/**
 * method _registerDevice
 */
Hook.Plugin.Cordova.PushNotification.prototype._registerDevice = function(id) {
  console.log("_registerDevice: " + id);

  this.client.post('push/registration', {
    device_id: id,
    app_name: this.appVersion,
    app_version: this.appVersion,
    platform: device.platform.toLowerCase()
  });
};
