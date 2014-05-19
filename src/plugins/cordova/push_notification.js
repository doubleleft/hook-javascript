/**
 * @class DL.Client.Cordova.PushNotification
 * @extends DL.Events
 */
DL.Client.Cordova = {};
DL.Client.Cordova.PushNotification = function() {};

// Inherits from Events
DL.Client.Cordova.PushNotification.prototype = new DL.Events();
DL.Client.Cordova.PushNotification.constructor = DL.Client.Cordova.PushNotification;

// References:
// http://androidexample.com/Android_Push_Notifications_using_Google_Cloud_Messaging_GCM/index.php?view=article_discription&aid=119&aaid=139
// http://www.androidhive.info/2012/10/android-push-notifications-using-google-cloud-messaging-gcm-php-and-mysql/
// http://devgirl.org/2012/10/25/tutorial-android-push-notifications-with-phonegap/
// http://devgirl.org/2012/10/19/tutorial-apple-push-notifications-with-phonegap-part-1/

/**
 * -------------
 * Dependencies:
 * -------------
 * - https://github.com/phonegap-build/PushPlugin
 * - https://github.com/apache/cordova-plugin-device
 * - https://github.com/danmichaelo/cordova-plugin-appinfo
 */

/**
 * Register device for Push Notifications
 * @method register
 * @return DL.Client.Cordova.PushNotification
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
DL.Client.Cordova.PushNotification.prototype.register = function(options) {
  var self = this,
      name  = null,
      registerOptions = {ecb: 'onNotification'},
      notificationPlugin = window.plugins && window.plugins.pushNotification;

  if (!notificationPlugin) {
    throw new Error("Please install PushPlugin: https://github.com/phonegap-build/PushPlugin");
  }

  if (typeof(device)==="undefined") {
    throw new Error("Please install device: https://github.com/apache/cordova-plugin-device");
  }

  if (device.platform.match(/android/i) || device.platform.match(/fireos/)) {
    // senderID is required for Android/FireOS
    if (!options.senderID) {
      throw new Error("senderID is required for Android apps. Create one at: https://developers.google.com/console");
    }
  }

  // merge options and registerOptions
  for (name in options) {
    if (options.hasOwnProperty(name)) {
      registerOptions[name] = options[name];
    }
  }

  // Check 'regid' for Android registrations
  this.on('registered', function(e) {
    if ( e.regid.length > 0 ) {
      self._registerDevice(e.regid);
    }
  });

  function successHandler(result) {
    console.log("successHandler: ", result);
    // on iOS devices, result is the token
    if (device.platform.match(/ios/i)) {
      self._registerDevice(result);
    }
  }

  function errorHandler(error) {
    console.log("Error: ", error);
  }


  // handle GCM notifications for Android
  function onNotification(e) {
    if (device.platform.match(/ios/i)) {
      if (e.alert) {
        $("#app-status-ul").append('<li>push-notification: ' + e.alert + '</li>');
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

    // trigger generic notification
    this.trigger('notification', e);

    // trigger event
    if (e.event) {
      this.trigger(event, e);
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

  // required
  notificationPlugin.register(successHandler, errorHandler, registerOptions);

  return this;
};

/**
 * Unregister device for Push Notifications
 * @method unregister
 */
DL.Client.Cordova.PushNotification.prototype.unregister = function(options) {
};

/**
 * method _registerDevice
 */
DL.Client.Cordova.PushNotification.prototype._registerDevice = function(id) {
  console.log("registration id = " + id);
};

/**
 * @property push
 * @type DL.Client.Cordova.PushNotification
 */
DL.Client.prototype.cordova.push = new DL.Client.Cordova.PushNotification();
