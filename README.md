Generate speech audio from super long text through machine (via "Google TTS", "ffmpeg").


## setup

1. [Enable API] for Google Cloud Text-to-Speech API.
2. [Setup authentication] with a service account.
<br>


## console

```bash
googletts "I want to order a stuffed crust pizza"
# out.mp3 created (yay!)

googletts -i speech.txt -o speech.mp3
# speech.mp3 created from text in speech.txt

googletts "Hello 911, my husband is in danger!" -vsg FEMALE
# out.mp3 created with female voice

googletts "Dead man walking." -vn en-US-Wavenet-B
# out.mp3 created with different male voice
```

### reference

```bash
googletts [options] <text>
# --help: show this help
# -o, --output: set output file (out.mp3)
# -i, --input:  set input file
# -c, --credentials:  set google credentials path
# -ot, --output_text:   enable text output
# -os, --output_ssmls:  enable SSMLs output
# -oa, --output_audios: enable audios output
# -aa, --audio_acodec:  set output audio acodec (copy)
# -vlc, --voice_languagecode: set voice language code (en-US)
# -vsg, --voice_ssmlgender:   set voice SSML gender (NEUTRAL)
# -vn, --voice_name:          set voice name (en-US-Wavenet-D)
# -qbt, --quote_breaktime:     set quoted text break time (250)
# -qel, --quote_emphasislevel: set quoted text emphasis level (moderate)
# -hbt, --heading_breaktime:     set heading text break time (4000)
# -hbd, --heading_breakdiff:     set heading text break difference (250)
# -hel, --heading_emphasislevel: set heading text emphasis level (strong)
# -ebt, --ellipsis_breaktime: set ellipsis break time (1500)
# -dbt, --dash_breaktime:     set dash break time (500)
# -nbt, --newline_breaktime:  set newline break time (1000)
# -bl, --block_length:    set SSMLs block length (5000)
# -bs, --block_separator: set SSMLs block separator (.)

# Environment variables:
$GOOGLETTS_LOG # enable log (0)
$GOOGLE_APPLICATION_CREDENTIALS # set google credentials path
$GOOGLETTS_OUTPUT_TEXT   # enable text output (0)
$GOOGLETTS_OUTPUT_SSMLS  # enable SSMLs output (0)
$GOOGLETTS_OUTPUT_AUDIOS # enable audios output (0)
$GOOGLETTS_AUDIO_ACODEC  # set output audio acodec (copy)
$GOOGLETTS_AUDIOS_VOICE_LANGUAGECODE # set voice language code (en-US)
$GOOGLETTS_AUDIOS_VOICE_SSMLGENDER   # set voice SSML gender (NEUTRAL)
$GOOGLETTS_AUDIOS_VOICE_NAME         # set voice name (en-US-Wavenet-D)
$GOOGLETTS_SSMLS_QUOTE_BREAKTIME     # set quoted text break time (250)
$GOOGLETTS_SSMLS_QUOTE_EMPHASISLEVEL # set quoted text emphasis level (moderate)
$GOOGLETTS_SSMLS_HEADING_BREAKTIME     # set heading text break time (4000)
$GOOGLETTS_SSMLS_HEADING_BREAKDIFF     # set heading text break difference (250)
$GOOGLETTS_SSMLS_HEADING_EMPHASISLEVEL # set heading text emphasis level (strong)
$GOOGLETTS_SSMLS_ELLIPSIS_BREAKTIME # set ellipsis break time (1500)
$GOOGLETTS_SSMLS_DASH_BREAKTIME     # set dash break time (500)
$GOOGLETTS_SSMLS_NEWLINE_BREAKTIME  # set newline break time (1000)
$GOOGLETTS_SSMLS_BLOCK_LENGTH    # set SSMLs block length (5000)
$GOOGLETTS_SSMLS_BLOCK_SEPARATOR # set SSMLs block separator (.)
```
<br>


## package

```javascript
const googletts = require('extra-googletts');

await googletts('out.mp3', 'I want to order a stuffed crust pizza');
// out.mp3 created (yay!)

const fs = require('fs');
var speech = fs.readFileSync('speech.txt', 'utf8');
await googletts('speech.mp3', speech)
// speech.mp3 created from text in speech.txt

await googletts('out.mp3', 'Hello 911, my husband is in danger!', {
  audios: {voice: {ssmlGender: 'FEMALE'}}
});
// out.mp3 created with female voice

await googletts('out.mp3', 'Dead man walking.', {
  audios: {voice: {name: 'en-US-Wavenet-B'}}
});
// out.mp3 created with different male voice
```

### reference

```javascript
const googletts = require('extra-googletts');

googletts(output, text, options={})
// output:  output file
// text:    input text
// options: optional
// -> Promise <output>

// Default options:
options = {
  output: {
    text: false,  // enable text output
    ssmls: false, // enable SSMLs output
    audios: false // enable audios output
  },
  tts: {
    // See TTS client options (below)
  },
  audio: {
    acodec: 'copy',    // set output audio acodec
    cp: {
      sync: true,      // enable synchronous child process
      stdio: [0, 1, 2] // set child process stdio
    }
  },
  audios: {
    voice: {
      languageCode: 'en-US',   // set voice language code
      ssmlGender: 'NEUTRAL'    // set voice SSML gender
      name: 'en-US-Wavenet-D', // set voice name
    }
  },
  ssmls: {
    quote: {
      breakTime: 250,           // set quoted text break time
      emphasisLevel: 'moderate' // set quoted text emphasis level
    },
    heading: {
      breakTime: 4000,         // set heading text break time
      breakDiff: 250,          // set heading text break difference
      emphasisLevel: 'strong', // set heading text emphasis level
    },
    ellipsis: {
      breakTime: 1500 // set ellipsis break time
    },
    dash: {
      breakTime: 500  // set dash break time
    },
    newline: {
      breakTime: 1000 // set newline break time
    },
    block: {
      length: 5000,  // set SSMLs block length
      separator: '.' // set SSMLs block separator
    }
  }
}
```


[![wikipedia-tts](https://i.imgur.com/Uu0KJ1U.jpg)](https://www.npmjs.com/package/wikipedia-tts)
> References: [SSML], [TTS voices], [TTS client docs].

[Install ffmpeg]: https://www.ffmpeg.org/download.html
[Enable API]: https://console.cloud.google.com/flows/enableapi?apiid=texttospeech.googleapis.com
[Setup authentication]: https://cloud.google.com/docs/authentication/getting-started
[SSML]: https://developers.google.com/actions/reference/ssml
[TTS voices]: https://cloud.google.com/text-to-speech/docs/voices
[TTS client docs]: https://cloud.google.com/nodejs/docs/reference/text-to-speech/0.1.x/v1beta1.TextToSpeechClient
