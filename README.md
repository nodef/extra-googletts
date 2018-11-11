Generate speech audio from super long text through machine (via ["Google TTS"], ["ffmpeg"]).
> Do you want to:
> - Share your ideas anonymously on YouTube?
> - Pretend on phone that you are not a kid (Home Alone)?
> - Learn good english pronunciation for a speech?
> - Make your computer read out your school notes?
> - Experiment with various voices from around the globe?
> - Or, [Upload Wikipedia TTS videos on YouTube]?

Sample: ["I want to order a stuffed crust pizza"](https://clyp.it/kje2yfdk).
<br>


## setup

1. [Enable API] for Google Cloud Text-to-Speech API.
2. [Setup authentication] with a service account.
<br>


## console

```bash
googletts "I want to order a stuffed crust pizza"
# out.mp3 created (yay!)

googletts -t speech.txt -o speech.mp3
# speech.mp3 created from text in speech.txt

googletts "Hello 911, my husband is in danger!" -vsg FEMALE
# out.mp3 created with female voice

echo "Dead man walking." | googletts --log -vn en-US-Wavenet-B
# out.mp3 created with different male voice (log enabled)
```
> Available [TTS voices]?


### reference

```bash
googletts [options] <text>
# --help: show this help
# -o, --output: set output audio file (out.mp3)
# -t, --text:   set input text file
# -l, --log:    enable log
# -c, --credentials:   set google credentials path
# -aa, --audio_acodec: set output audio acodec (copy)
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
$GOOGLETTS_AUDIO_ACODEC        # set output audio acodec (copy)
$GOOGLETTS_VOICE_LANGUAGECODE  # set voice language code (en-US)
$GOOGLETTS_VOICE_SSMLGENDER    # set voice SSML gender (NEUTRAL)
$GOOGLETTS_VOICE_NAME          # set voice name (en-US-Wavenet-D)
$GOOGLETTS_QUOTE_BREAKTIME     # set quoted text break time (250)
$GOOGLETTS_QUOTE_EMPHASISLEVEL # set quoted text emphasis level (moderate)
$GOOGLETTS_HEADING_BREAKTIME     # set heading text break time (4000)
$GOOGLETTS_HEADING_BREAKDIFF     # set heading text break difference (250)
$GOOGLETTS_HEADING_EMPHASISLEVEL # set heading text emphasis level (strong)
$GOOGLETTS_ELLIPSIS_BREAKTIME # set ellipsis break time (1500)
$GOOGLETTS_DASH_BREAKTIME     # set dash break time (500)
$GOOGLETTS_NEWLINE_BREAKTIME  # set newline break time (1000)
$GOOGLETTS_BLOCK_LENGTH    # set SSMLs block length (5000)
$GOOGLETTS_BLOCK_SEPARATOR # set SSMLs block separator (.)
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
  log: true,
  audios: {voice: {name: 'en-US-Wavenet-B'}}
});
// out.mp3 created with different male voice (log enabled)
```

### reference

```javascript
const googletts = require('extra-googletts');

googletts(output, text, options={})
// output:  output audio file
// text:    input text
// options: given below
// -> Promise <output>

// Default options:
options = {
  log: false, // enable log
  credentials: {
    // See TTS client options (below)
  },
  audio: {
    acodec: 'copy',    // set output audio acodec
    cp: null           // child process options (sync, stdio)
  },
  voice: {
    languageCode: 'en-US',   // set voice language code
    ssmlGender: 'NEUTRAL'    // set voice SSML gender
    name: 'en-US-Wavenet-D', // set voice name
  }
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
```
<br>


## similar

Do you need anything similar?
- [extra-stillvideo] can generate video from audio and image.
- [extra-youtubeuploader] can upload videos with caption to YouTube.

Suggestions are welcome. Please [create an issue].
<br>


[![nodef](https://i.imgur.com/LPVfMny.jpg)](https://nodef.github.io)
> References: [SSML], [TTS voices], [TTS client docs].

["Google TTS"]: https://cloud.google.com/text-to-speech/
["ffmpeg"]: https://ffmpeg.org
[Upload Wikipedia TTS videos on YouTube]: https://www.youtube.com/results?search_query=wikipedia+audio+article

[Enable API]: https://console.cloud.google.com/flows/enableapi?apiid=texttospeech.googleapis.com
[Setup authentication]: https://cloud.google.com/docs/authentication/getting-started

[extra-stillvideo]: https://www.npmjs.com/package/extra-stillvideo
[extra-youtubeuploader]: https://www.npmjs.com/package/extra-youtubeuploader
[create an issue]: https://github.com/nodef/extra-googletts/issues

[SSML]: https://developers.google.com/actions/reference/ssml
[TTS voices]: https://cloud.google.com/text-to-speech/docs/voices
[TTS client docs]: https://cloud.google.com/nodejs/docs/reference/text-to-speech/0.1.x/v1beta1.TextToSpeechClient
