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
  this.segments = 'auth/' + this.provider + "/CAAD2jhum0ZCsBAD8bPT5ThKE6YnRvllsoKPa5YvyhxzRl2HTLwcZBc3tUuXFrGEqthJM7TeL8wuBtkQBEQGs3QdmbaxkZALragniqYSBTRRRUNVFxaXJN35EwBDPPatYEWgYOR7M5ZBICLmRiXvRel8pcUiBRA6AoUqzPCaeAOpDJNvhA1MufvTIX7PzXnQZD";
 };

DL.Auth.prototype.register = function() {
  return this.client.post(this.segments);
};
