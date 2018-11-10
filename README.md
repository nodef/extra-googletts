Generate speech audio from super long text through machine (via "Google TTS", "ffmpeg").
Get TTS audio for english text.



## setup

1. [Install ffmpeg] and add to `PATH`.
2. [Enable API] for Google Cloud Text-to-Speech API.
3. [Setup authentication] with a service account.



## usage

```javascript
const english = require('@wikipedia-tts/english');
// english(<output>, <text>, [options])
// -> Promise <output>

// [options]: {
//   output: {
//     text: $WIKIPEDIATTS_OUTPUT_TEXT||false,
//     ssmls: $WIKIPEDIATTS_OUTPUT_SSMLS||false,
//     audios: $WIKIPEDIATTS_OUTPUT_AUDIOS||false
//   },
//   tts: {
//     // See TTS client options (below)
//   },
//   audio: {
//     acodec: $WIKIPEDIATTS_AUDIO_ACODEC||'copy',
//     cp: {
//       sync: true,
//       stdio: [0, 1, 2]
//     }
//   },
//   audios: {
//     voice: {
//       name: $WIKIPEDIATTS_AUDIOS_VOICE_NAME||'en-US-Wavenet-D',
//       languageCode: $WIKIPEDIATTS_AUDIOS_VOICE_LANGUAGECODE||'en-US',
//       ssmlGender: $WIKIPEDIATTS_AUDIOS_VOICE_SSMLGENDER||'NEUTRAL'
//     }
//   },
//   ssmls: {
//     block: {
//       length: $WIKIPEDIATTS_SSMLS_BLOCK_LENGTH||5000,
//       separator: $WIKIPEDIATTS_SSMLS_BLOCK_SEPARATOR||'.'
//     },
//     quote: {
//       breakTime: $WIKIPEDIATTS_SSMLS_QUOTE_BREAKTIME||250,
//       emphasisLevel: $WIKIPEDIATTS_SSMLS_QUOTE_EMPHASISLEVEL||'moderate'
//     },
//     heading: {
//       breakTime: $WIKIPEDIATTS_SSMLS_HEADING_BREAKTIME||4000,
//       breakDiff: $WIKIPEDIATTS_SSMLS_HEADING_BREAKDIFF||250,
//       emphasisLevel: $WIKIPEDIATTS_SSMLS_HEADING_EMPHASISLEVEL||'strong',
//     },
//     ellipsis: {
//       breakTime: $WIKIPEDIATTS_SSMLS_ELLIPSIS_BREAKTIME||1500
//     },
//     dash: {
//       breakTime: $WIKIPEDIATTS_SSMLS_DASH_BREAKTIME||500
//     },
//     newline: {
//       breakTime: $WIKIPEDIATTS_SSMLS_NEWLINE_BREAKTIME||1000
//     }
//   }
// }



await english('output.mp3', 'The Knight said you were gutless!');
// output.mp3 created
```


[![wikipedia-tts](https://i.imgur.com/Uu0KJ1U.jpg)](https://www.npmjs.com/package/wikipedia-tts)
> References: [SSML], [TTS voices], [TTS client docs].

[Install ffmpeg]: https://www.ffmpeg.org/download.html
[Enable API]: https://console.cloud.google.com/flows/enableapi?apiid=texttospeech.googleapis.com
[Setup authentication]: https://cloud.google.com/docs/authentication/getting-started
[SSML]: https://developers.google.com/actions/reference/ssml
[TTS voices]: https://cloud.google.com/text-to-speech/docs/voices
[TTS client docs]: https://cloud.google.com/nodejs/docs/reference/text-to-speech/0.1.x/v1beta1.TextToSpeechClient
