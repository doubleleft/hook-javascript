test("Client: getPayload", function() {
  var payload, data;

  payload = client.getPayload("GET", {});
  ok(payload == null, "empty payload should return null");

  payload = client.getPayload("GET", {name: "it's a string"});
  ok(payload == "%7B%22name%22%3A%22it's%20a%20string%22%7D", "string on payloads");

  payload = client.getPayload("GET", {integer: 100});
  ok(payload == "%7B%22integer%22%3A100%7D", "integer on payloads");

  var date = new Date();
  payload = client.getPayload("GET", {date: date});
  ok(payload == "%7B%22date%22%3A"+Math.round(date.getTime() / 1000)+"%7D", "dates should be converted to timestamps on payload");
});
