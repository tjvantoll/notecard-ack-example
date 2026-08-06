#include <Arduino.h>
#include <Notecard.h>

#define serialDebug Serial
#define productUID "com.blues.tvantoll:acknowledgments"

Notecard notecard;

// The state the LED actually has.
bool ledState = false;

// Acknowledge a change by reporting the state the LED actually has. This
// writes the led-reported variable in the Notecard's vars.db DB Notefile,
// which syncs to Notehub, where the web app reads it.
void reportLedState()
{
  J *req = notecard.newRequest("var.set");
  if (req != NULL)
  {
    JAddStringToObject(req, "name", "led-reported");
    JAddBoolToObject(req, "flag", ledState);
    JAddBoolToObject(req, "sync", true);
    notecard.sendRequest(req);
  }
}

// Create the led-desired variable with a default value if it doesn't
// exist yet, so the variable is always available for the web app to
// read and update.
void initializeLedDesired()
{
  J *req = notecard.newRequest("var.get");
  JAddStringToObject(req, "name", "led-desired");

  J *rsp = notecard.requestAndResponse(req);
  if (notecard.responseError(rsp) &&
      NoteResponseErrorContains(rsp, "{note-noexist}"))
  {
    J *set = notecard.newRequest("var.set");
    JAddStringToObject(set, "name", "led-desired");
    JAddBoolToObject(set, "flag", false);
    notecard.sendRequest(set);
  }
  notecard.deleteResponse(rsp);
}

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

  // Make sure both state variables exist: led-desired for the web app
  // to write, and led-reported for the web app to read.
  initializeLedDesired();
  reportLedState();

  // Sync with Notehub immediately, so the variables appear there right
  // away rather than waiting for the next periodic sync.
  {
    J *req = notecard.newRequest("hub.sync");
    notecard.sendRequest(req);
  }
}

void loop()
{
  // Read the state the user wants the LED to have, which the web app
  // writes to the led-desired variable in the Notecard's vars.db
  // DB Notefile.
  J *req = notecard.newRequest("var.get");
  JAddStringToObject(req, "name", "led-desired");

  J *rsp = notecard.requestAndResponse(req);
  if (!notecard.responseError(rsp))
  {
    bool desired = JGetBool(rsp, "flag");
    if (desired != ledState)
    {
      notecard.logDebug(desired ? "Turning light on\n" : "Turning light off\n");
      digitalWrite(LED_BUILTIN, desired ? HIGH : LOW);
      ledState = desired;
      reportLedState();
    }
  }
  notecard.deleteResponse(rsp);

  // Wait one second before checking again
  delay(1000);
}
