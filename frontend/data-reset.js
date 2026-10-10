/* Clears this browser's cached Leo user data once after the launch reset. */
(function () {
  var resetEpoch = 'leo_launch_reset_20261010_v1';
  try {
    if (localStorage.getItem('leo_data_reset_epoch') === resetEpoch) return;
    for (var i = localStorage.length - 1; i >= 0; i--) {
      var key = localStorage.key(i);
      if (key && key.indexOf('leo_') === 0) localStorage.removeItem(key);
    }
    for (var j = sessionStorage.length - 1; j >= 0; j--) {
      var sessionKey = sessionStorage.key(j);
      if (sessionKey && sessionKey.indexOf('leo_') === 0) sessionStorage.removeItem(sessionKey);
    }
    localStorage.setItem('leo_data_reset_epoch', resetEpoch);
  } catch (error) {
    console.warn('Leo data reset could not clear this browser cache:', error);
  }
})();
