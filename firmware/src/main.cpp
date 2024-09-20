#include <Arduino.h>
#include <Notecard.h>

#define serialDebug Serial
#define productUID "com.blues.tvantoll:acknowledgments"

Notecard notecard;

void setup()
{
  static const size_t MAX_SERIAL_WAIT_MS = 5000;
  size_t begin_serial_wait_ms = ::millis();
  // Wait for the serial port to become available
  while (!serialDebug && (MAX_SERIAL_WAIT_MS > (::millis() - begin_serial_wait_ms)));
  serialDebug.begin(115200);
  notecard.setDebugOutputStream(serialDebug);

  notecard.begin();

  // Configure the Notecard
  {
    J *req = notecard.newRequest("hub.set");
    JAddStringToObject(req, "product", productUID);
    JAddStringToObject(req, "mode", "continuous");
    JAddNumberToObject(req, "inbound", 5);
    JAddNumberToObject(req, "outbound", 5);
    JAddBoolToObject(req, "sync", true);
    if (!notecard.sendRequest(req)) {
      JDelete(req);
    }
  }

  // Initialize digital pin LED_BUILTIN as an output,
  // and ensure the light starts off.
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
}

void sendAck(char *state, char *id)
{
  J *req = notecard.newRequest("note.add");
  if (req != NULL)
  {
    JAddStringToObject(req, "file", "ack.qo");
    JAddBoolToObject(req, "sync", true);
    J *body = JAddObjectToObject(req, "body");
    if (body)
    {
      JAddStringToObject(body, "led-state", state);
      JAddStringToObject(body, "id", id);
    }
    notecard.sendRequest(req);
  }

}

void loop()
{
  // To hold "led-on" and "led-off". Increase the size if you need to send longer commands.
  char command[7];
  char id[10];

  J *req = notecard.newRequest("note.get");
  JAddStringToObject(req, "file", "commands.qi");
  JAddBoolToObject(req, "delete", true);

  J *rsp = notecard.requestAndResponse(req);
  if (notecard.responseError(rsp)) {
    notecard.logDebug("No notes available");
    command[0] = '\0';
  } else {
    J *body = JGetObject(rsp, "body");
    strncpy(command, JGetString(body, "command"), sizeof(command));
    strncpy(id, JGetString(body, "id"), sizeof(id));
  }

  notecard.deleteResponse(rsp);

  if (!strncmp(command, "led-on", sizeof("led-on")))
  {
    notecard.logDebug("Turning light on");
    digitalWrite(LED_BUILTIN, HIGH);
    sendAck("on", id);
  }
  if (!strncmp(command, "led-off", sizeof("led-off")))
  {
    notecard.logDebug("Turning light off");
    digitalWrite(LED_BUILTIN, LOW);
    sendAck("off", id);
  }

  // Wait one second before looking for changes again
  delay(1000);
}
