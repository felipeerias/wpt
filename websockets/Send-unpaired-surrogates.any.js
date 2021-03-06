// META: script=constants.sub.js
// META: variant=
// META: variant=?wss
// META: variant=?wpt_flags=h2

var testOpen = async_test("Send unpaired surrogates on a WebSocket - Connection should be opened");
var testMessage = async_test("Send unpaired surrogates on a WebSocket - Message should be received");
var testClose = async_test("Send unpaired surrogates on a WebSocket - Connection should be closed");

var data = "\uD807";
var replacementChar = "\uFFFD";
var wsocket = CreateWebSocket(false, false);
var isOpenCalled = false;

wsocket.addEventListener('open', testOpen.step_func(function(evt) {
  wsocket.send(data);
  isOpenCalled = true;
  testOpen.done();
}), true);

wsocket.addEventListener('message', testMessage.step_func(function(evt) {
  assert_equals(evt.data, replacementChar);
  wsocket.close();
  testMessage.done();
}), true);

wsocket.addEventListener('close', testClose.step_func(function(evt) {
  assert_true(isOpenCalled, "WebSocket connection should be open");
  assert_equals(evt.wasClean, true, "wasClean should be true");
  testClose.done();
}), true);
