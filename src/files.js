/**
 */
DL.Files = function(client) {
  this.client = client;
};

/**
 * @return {Promise}
 */
DL.Files.prototype.upload = function(provider, data) {
  this.client.post('/files', data);
};

/**
 * @return {Promise}
 */
DL.Files.prototype.get = function(_id) {
  return this.client.get('/files', { _id: _id });
};
