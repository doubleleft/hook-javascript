/**
 * @class Push
 */
DL.Client.Cordova = {};
DL.Client.Cordova.PushNotification = function() {};

/**
 * -------------
 * Dependencies:
 * -------------
 * - https://github.com/phonegap-build/PushPlugin
 * - https://github.com/apache/cordova-plugin-device
 * - https://github.com/danmichaelo/cordova-plugin-appinfo
 */

/**
 * @method register
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

    $("#app-status-ul").append('<li>EVENT -> RECEIVED:' + e.event + '</li>');

    if (e.event == "registered") {
      if ( e.regid.length > 0 ) {
        self._sendRegistration(e.regid);
      }
    } else if (e.event == "message") {
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

    } else if (e.event === "error") {
      console.log(e.msg);

    } else {
      console.log("triggered a unknown event");
    }
  }

  function successHandler(result) {
    console.log("successHandler: ", result);
    // on iOS devices, result is the token
    if (device.platform.match(/ios/i)) {
      self._sendRegistration(result);
    }
  }

  function errorHandler(error) {
    console.log("Error: ", error);
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
 * @method onNotification
 * @param {Function} callback
 * @return {DL.Client.Cordova.PushNotification} this
 */
DL.Client.Cordova.PushNotification.prototype.onNotification = function(callback) {
  this._onNotification = callback;
};

/**
 * @method unregister
 */
DL.Client.Cordova.PushNotification.prototype.unregister = function(options) {
};

/**
 * method _sendRegistration
 */
DL.Client.Cordova.PushNotification.prototype._sendRegistration = function(id) {
  console.log("registration id = " + id);
};

/**
 * @property push
 */
DL.Client.prototype.cordova.push = new DL.Client.Cordova.PushNotification();
