let micMode = false;
let recording = false;

let mediaRecorder = null;
let audioChunks = [];

let recordingTimer = null;

let activeElement = null;


// ==========================================
// KEYBOARD CONTROL
// ==========================================

document.addEventListener("keydown", function(event) {

    // Ignore keyboard shortcuts while typing normally
    // except C and W functionality.

    const key = event.key.toLowerCase();


    // ======================================
    // C → TOGGLE MIC MODE
    // ======================================

    if (key === "c" && !event.repeat) {

        // Don't trigger when typing inside an input
        if (
            document.activeElement &&
            (
                document.activeElement.tagName === "INPUT" ||
                document.activeElement.tagName === "TEXTAREA"
            )
        ) {
            return;
        }

        micMode = !micMode;

        if (micMode) {

            document.body.classList.add("voice-mic-mode");

            showStatus("🎤 Voice Mode ON");

        } else {

            document.body.classList.remove("voice-mic-mode");

            showStatus("Normal Cursor");
        }

        return;
    }


    // ======================================
    // W → START RECORDING
    // ======================================

    if (key === "w" && !event.repeat) {

        if (!micMode) {
            showStatus("Press C first to activate mic mode");
            return;
        }

        if (!recording) {

            startRecording();

        } else {

            stopRecording();
        }

        return;
    }


    // ======================================
    // ENTER → STOP + SEND
    // ======================================

    if (event.key === "Enter" && recording) {

        event.preventDefault();

        stopRecording();

        return;
    }

});


// ==========================================
// REMEMBER CURRENT TEXT BOX
// ==========================================

document.addEventListener("focusin", function(event) {

    if (isEditable(event.target)) {

        activeElement = event.target;

    }

});


// ==========================================
// ALSO REMEMBER CLICKED TEXT BOX
// ==========================================

document.addEventListener("click", function(event) {

    if (isEditable(event.target)) {

        activeElement = event.target;

    }

});


// ==========================================
// CHECK EDITABLE ELEMENT
// ==========================================

function isEditable(element) {

    if (!element) {
        return false;
    }

    if (
        element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA"
    ) {
        return true;
    }

    if (element.isContentEditable) {
        return true;
    }

    return false;
}


// ==========================================
// START RECORDING
// ==========================================

async function startRecording() {

    try {

        activeElement = document.activeElement;


        // Request microphone

        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });


        audioChunks = [];


        mediaRecorder =
            new MediaRecorder(stream);


        mediaRecorder.ondataavailable =
            function(event) {

                if (event.data.size > 0) {

                    audioChunks.push(event.data);
                }
            };


        mediaRecorder.onstop =
            function() {

                stream.getTracks().forEach(
                    track => track.stop()
                );

                processRecording();
            };


        mediaRecorder.start();

        recording = true;


        document.body.classList.add(
            "voice-recording"
        );


        showStatus(
            "🔴 Recording... 30 seconds maximum"
        );


        // ==================================
        // AUTOMATIC 30 SECOND STOP
        // ==================================

        recordingTimer =
            setTimeout(function() {

                if (recording) {

                    showStatus(
                        "⏱️ 30 seconds reached"
                    );

                    stopRecording();
                }

            }, 30000);


    } catch (error) {

        console.error(error);

        showStatus(
            "❌ Microphone permission denied"
        );
    }
}


// ==========================================
// STOP RECORDING
// ==========================================

function stopRecording() {

    if (!mediaRecorder || !recording) {
        return;
    }


    clearTimeout(recordingTimer);


    recording = false;


    mediaRecorder.stop();


    document.body.classList.remove(
        "voice-recording"
    );


    showStatus(
        "⏳ Processing voice..."
    );
}


// ==========================================
// PROCESS AUDIO
// ==========================================

async function processRecording() {

    const audioBlob =
        new Blob(
            audioChunks,
            {
                type: "audio/webm"
            }
        );


    const formData =
        new FormData();


    formData.append(
        "audio",
        audioBlob,
        "voice.webm"
    );


    try {

        showStatus(
            "🧠 Converting voice to text..."
        );


        const response =
            await fetch(
                "http://localhost:5000/process-voice",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error || "Server error"
            );
        }


        console.log(
            "Transcript:",
            data.transcript
        );


        showStatus(
            "🤖 Asking Gemini..."
        );


        // Send transcript to Gemini

        const geminiResponse =
            await fetch(
                "http://localhost:5000/gemini",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        query: data.transcript
                    })
                }
            );


        const result =
            await geminiResponse.json();


        if (!geminiResponse.ok) {

            throw new Error(
                result.error || "Gemini error"
            );
        }


        console.log(
            "Gemini:",
            result.response
        );


        // ==================================
        // INSERT INTO ACTIVE TEXT BOX
        // ==================================

        insertIntoActiveElement(
            result.response
        );


        showStatus(
            "✅ Gemini response inserted"
        );


    } catch (error) {

        console.error(error);

        showStatus(
            "❌ " + error.message
        );
    }
}


// ==========================================
// INSERT GEMINI RESPONSE
// ==========================================

function insertIntoActiveElement(text) {

    let element =
        activeElement;


    // If active element disappeared,
    // find currently focused element.

    if (!isEditable(element)) {

        element =
            document.activeElement;
    }


    if (!isEditable(element)) {

        showStatus(
            "⚠️ Click a text box first"
        );

        return;
    }


    // ======================================
    // INPUT / TEXTAREA
    // ======================================

    if (
        element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA"
    ) {

        const start =
            element.selectionStart;

        const end =
            element.selectionEnd;

        const oldValue =
            element.value;


        element.value =
            oldValue.substring(0, start) +
            text +
            oldValue.substring(end);


        element.selectionStart =
            element.selectionEnd =
            start + text.length;


        element.dispatchEvent(
            new Event(
                "input",
                {
                    bubbles: true
                }
            )
        );


        element.dispatchEvent(
            new Event(
                "change",
                {
                    bubbles: true
                }
            )
        );


        return;
    }


    // ======================================
    // CONTENTEDITABLE
    // ======================================

    if (element.isContentEditable) {

        element.focus();


        const selection =
            window.getSelection();


        if (
            selection &&
            selection.rangeCount > 0
        ) {

            const range =
                selection.getRangeAt(0);

            range.deleteContents();

            const textNode =
                document.createTextNode(text);

            range.insertNode(textNode);

            range.setStartAfter(textNode);

            range.collapse(true);

            selection.removeAllRanges();

            selection.addRange(range);

        } else {

            element.innerText += text;
        }


        element.dispatchEvent(
            new InputEvent(
                "input",
                {
                    bubbles: true,
                    inputType:
                        "insertText",
                    data: text
                }
            )
        );
    }
}


// ==========================================
// STATUS UI
// ==========================================

function showStatus(message) {

    let status =
        document.getElementById(
            "voice-gemini-status"
        );


    if (!status) {

        status =
            document.createElement("div");

        status.id =
            "voice-gemini-status";

        document.body.appendChild(status);
    }


    status.innerText =
        message;


    status.classList.add(
        "show"
    );


    clearTimeout(
        status.hideTimer
    );


    status.hideTimer =
        setTimeout(function() {

            status.classList.remove(
                "show"
            );

        }, 3000);
}
