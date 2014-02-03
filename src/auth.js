/**
 * @class DL.Auth
 *
 * @param {DL.Client} client
 * @param {String} provider
 * @constructor
 */
DL.Auth = function(client, provider) {
  this.client = client;
  this.provider = provider;
  this.segments = 'auth/' + this.provider;
 };

DL.Auth.prototype.register = function(additionalInfo) {
  if (typeof(additionalInfo)==="undefined") { additionalInfo = {}; }
  return this.client.post(this.segments, additionalInfo);
};
