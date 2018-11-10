const textToSpeech = require('@google-cloud/text-to-speech');
const randomItem = require('random-item');
const getStdin = require('get-stdin');
const boolean = require('boolean');
const tempy = require('tempy');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');


// Global variables
const E = process.env;
const LOG = boolean(E['GOOGLETTS_LOG']||'0');
const OUTPUT = {
  text: boolean(E['GOOGLETTS_OUTPUT_TEXT']||'0'),
  ssmls: boolean(E['GOOGLETTS_OUTPUT_SSMLS']||'0'),
  audios: boolean(E['GOOGLETTS_OUTPUT_AUDIOS']||'0')
};
const AUDIO = {
  acodec: E['GOOGLETTS_AUDIO_ACODEC']||'copy'
};
const CP = {
  sync: true,
  stdio: [0, 1, 2]
};
const AUDIOS_VOICE = {
  languageCode: E['GOOGLETTS_AUDIOS_VOICE_LANGUAGECODE']||'en-US',
  ssmlGender: E['GOOGLETTS_AUDIOS_VOICE_SSMLGENDER']||'NEUTRAL'
};
const AUDIOS_VOICE_NAME = E['GOOGLETTS_AUDIOS_VOICE_NAME']||'en-US-Wavenet-D';
const SSMLS_QUOTE = {
  breakTime: parseFloat(E['GOOGLETTS_SSMLS_QUOTE_BREAKTIME']||'250'),
  emphasisLevel: E['GOOGLETTS_SSMLS_QUOTE_EMPHASISLEVEL']||'moderate'
};
const SSMLS_HEADING = {
  breakTime: parseFloat(E['GOOGLETTS_SSMLS_HEADING_BREAKTIME']||'4000'),
  breakDiff: parseFloat(E['GOOGLETTS_SSMLS_HEADING_BREAKDIFF']||'250'),
  emphasisLevel: parseFloat(E['GOOGLETTS_SSMLS_HEADING_EMPHASISLEVEL']||'strong'),
};
const SSMLS_ELLIPSIS = {
  breakTime: parseFloat(E['GOOGLETTS_SSMLS_ELLIPSIS_BREAKTIME']||'1500')
};
const SSMLS_DASH = {
  breakTime: parseFloat(E['GOOGLETTS_SSMLS_DASH_BREAKTIME']||'500')
};
const SSMLS_NEWLINE = {
  breakTime: parseFloat(E['GOOGLETTS_SSMLS_NEWLINE_BREAKTIME']||'1000')
};
const SSMLS_BLOCK = {
  length: parseFloat(E['GOOGLETTS_SSMLS_BLOCK_LENGTH']||'5000'),
  separator: E['GOOGLETTS_SSMLS_BLOCK_SEPARATOR']||'.'
};
const GOOGLE = E['GOOGLE_APPLICATION_CREDENTIALS'];
const FN_NOP = () => 0;


// Get filename, without extension.
function pathFilename(pth) {
  return pth.substring(0, pth.length-path.extname(pth).length);
};

// Write to file, return promise.
function fsWriteFile(pth, dat, o) {
  if(LOG) console.log('fsWriteFile:', pth);
  return new Promise((fres, frej) => {
    fs.writeFile(pth, dat, o, (err) => {
      if(err) frej(err);
      else fres(pth);
    });
  });
};

// Execute child process, return promise.
function cpExec(cmd, o) {
  o = Object.assign({}, CP, o);
  if(LOG) console.log('cpExec:', cmd);
  if(o.sync) return Promise.resolve({stdout: cp.execSync(cmd, o)});
  return new Promise((fres, frej) => {
    cp.exec(cmd, o, (err, stdout, stderr) => {
      if(err) frej(err);
      else fres({stdout, stderr});
    });
  });
};

// Get SSML from text.
function textSsml(txt, o) {
  var o = o||{};
  var q = Object.assign({}, SSMLS_QUOTE, o.quote);
  var h = Object.assign({}, SSMLS_HEADING, o.heading);
  var e = Object.assign({}, SSMLS_ELLIPSIS, o.ellipsis);
  var d = Object.assign({}, SSMLS_DASH, o.dash);
  var n = Object.assign({}, SSMLS_NEWLINE, o.newline);
  txt = txt.replace(/([\'\"])(.*?)\1/gm, (m, p1, p2) => {
    var brk = `<break time="${q.breakTime}ms"/>`;
    var emp = `<emphasis level="${q.emphasisLevel}">${p1}${p2}${p1}</emphasis>`;
    return brk+emp+brk;
  });
  txt = txt.replace(/(=+)\s(.*?)\s\1/g, (m, p1, p2) => {
    var brk = `<break time="${h.breakTime-p1.length*h.breakDiff}ms"/>Topic `;
    var emp = `<emphasis level="${h.emphasisLevel}">${p2}</emphasis>`;
    return brk+emp+brk;
  });
  // txt = txt.replace(/\((.*?)\)/gm, '<emphasis level="reduced">($1)</emphasis>');
  // txt = txt.replace(/\[(.*?)\]/gm, '<emphasis level="reduced">[$1]</emphasis>');
  txt = txt.replace(/\.\.\./g, `<break time="${e.breakTime}ms"/>...`);
  txt = txt.replace(/\—/g, `<break time="${d.breakTime}ms"/>—`);
  txt = txt.replace(/(\r?\n)+/gm, `<break time="${n.breakTime}ms"/>\n`);
  return `<speak>${txt}</speak>`;
};

// Get SSML block from long text.
function textSsmlBlock(txt, o) {
  var o = o||{};
  var b = Object.assign({}, SSMLS_BLOCK, o.block);
  for(var end=b.length;;) {
    end = Math.floor(0.75*end);
    var i = txt.lastIndexOf(b.separator, end)+1;
    i = i>0? i:Math.min(txt.length, end);
    var ssml = textSsml(txt.substring(0, i), o);
    if(ssml.length<b.length) break;
  }
  return [ssml, txt.substring(i)];
};

// Write TTS output to file.
function audiosWrite(tts, out, ssml, o) {
  var o = o||{};
  if(LOG) console.log('audioWrite:', out);
  var v = Object.assign({}, AUDIOS_VOICE, o.voice);
  if(v.languageCode===AUDIOS_VOICE.languageCode) v.name = AUDIOS_VOICE_NAME;
  var req = {input: {ssml}, voice: v, audioConfig: {audioEncoding: 'MP3'}};
  return new Promise((fres, frej) => {
    tts.synthesizeSpeech(req, (err, res) => {
      if(err) return frej(err);
      fs.writeFile(out, res.audioContent, 'binary', (err) => {
        if(LOG) console.log('audioWrite:', out);
        if(err) return frej(err);
        fres(out);
      });
    });
  });
};

// Generate output text file.
function outputText(out, txt) {
  if(LOG) console.log('outputText:', out);
  if(out) fsWriteFile(out, txt);
  return '\n'+txt;
};

// Generate output SSML part files.
function outputSsmls(out, txt, o) {
  if(LOG) console.log('outputSsmls:', out);
  var pth = out? pathFilename(out):null;
  var ext = out? path.extname(out):null;
  for(var i=0, z=[]; txt; i++) {
    var [ssml, txt] = textSsmlBlock(txt, o);
    if(out) fsWriteFile(`${pth}.${i}${ext}`, ssml);
    z[i] = ssml;
  }
  return z;
};

// Generate output audio part files.
function outputAudios(tts, out, ssmls, o) {
  if(LOG) console.log('outputAudios:', out);
  var pth = pathFilename(out), ext = path.extname(out);
  for(var i=0, I=ssmls.length, z=[]; i<I; i++)
    z[i] = audiosWrite(tts, `${pth}.${i}${ext}`, ssmls[i], o);
  return Promise.all(z);
};

// Generate output audio file.
function outputAudio(out, auds, o) {
  var o = Object.assign({}, AUDIO, o);
  if(LOG) console.log('outputAudio:', out);
  return cpExec(`ffmpeg -y -i "concat:${auds.join('|')}" -acodec ${o.acodec} "${out}"`, o.cp||{}).then(() => out);
};

// Write Full TTS output to file.
async function googletts(out, txt, o) {
  var o = o||{};
  var u = Object.assign({}, OUTPUT, o.output);
  var t = GOOGLE? {keyFilename: randomItem(GOOGLE.split(';'))}:null;
  if(LOG) console.log('@googletts:', out);
  var tts = new textToSpeech.TextToSpeechClient(o.tts||t);
  var pth = pathFilename(out);
  var txt = outputText(u.text? pth+'.txt':null, txt);
  var ssmls = outputSsmls(u.ssmls? pth+'.ssml':null, txt, o.ssmls);
  var audp = u.audios? pth+'.mp3':tempy.file({extension: 'mp3'});
  var auds = await outputAudios(tts, audp, ssmls, o.audios);
  out = await outputAudio(out, auds, o.audio);
  if(!u.audios) { for(var f of auds) fs.unlink(f, FN_NOP); }
  return out;
};
module.exports = googletts;

// Run on console.
async function console(A) {
  var txt = await getStdin();
  var out = 'out.mp3', o = {};
  for(var i=2, I=A.length; i<I; i++) {
    if(A[i]==='--help') return cp.execSync('less README.md', {cwd: __dirname, stdio: [0, 1, 2]});
    else if(A[i]==='-o' || A[i]==='--output') out = A[++i];
    else if(A[i]==='-i' || A[i]==='--input') txt = fs.readFileSync(A[++i], 'utf8');
    else if(A[i]==='-c' || A[i]==='--credentials') Object.assign(o, {tts: A[++i]});
    else if(A[i]==='-ot' || A[i]==='--output_text') Object.assign(o, {output: {text: true}});
    else if(A[i]==='-os' || A[i]==='--output_ssmls') Object.assign(o, {output: {ssmls: true}});
    else if(A[i]==='-oa' || A[i]==='--output_audios') Object.assign(o, {output: {audios: true}});
    else if(A[i]==='-aa' || A[i]==='--audio_acodec') Object.assign(o, {audio: {acodec: A[++i]}});
    else if(A[i]==='-vlc' || A[i]==='--voice_languagecode') Object.assign(o, {audios: {voice: {languageCode: A[++i]}}});
    else if(A[i]==='-vsg' || A[i]==='--voice_ssmlgender') Object.assign(o, {audios: {voice: {ssmlGender: A[++i]}}});
    else if(A[i]==='-vn' || A[i]==='--voice_name') Object.assign(o, {audios: {voice: {name: A[++i]}}});
    else if(A[i]==='-qbt' || A[i]==='--quote_breaktime') Object.assign(o, {ssmls: {quote: {breakTime: parseFloat(A[++i])}}});
    else if(A[i]==='-qel' || A[i]==='--quote_emphasislevel') Object.assign(o, {ssmls: {quote: {emphasisLevel: A[++i]}}});
    else if(A[i]==='-hbt' || A[i]==='--heading_breaktime') Object.assign(o, {ssmls: {heading: {breakTime: parseFloat(A[++i])}}});
    else if(A[i]==='-hbd' || A[i]==='--heading_breakdiff') Object.assign(o, {ssmls: {heading: {breakDiff: parseFloat(A[++i])}}});
    else if(A[i]==='-hel' || A[i]==='--heading_emphasislevel') Object.assign(o, {ssmls: {heading: {emphasisLevel: A[++i]}}});
    else if(A[i]==='-ebt' || A[i]==='--ellipsis_breaktime') Object.assign(o, {ssmls: {ellipsis: {breakTime: parseFloat(A[++i])}}});
    else if(A[i]==='-dbt' || A[i]==='--dash_breaktime') Object.assign(o, {ssmls: {dash: {breakTime: parseFloat(A[++i])}}});
    else if(A[i]==='-nbt' || A[i]==='--newline_breaktime') Object.assign(o, {ssmls: {newline: {breakTime: parseFloat(A[++i])}}});
    else if(A[i]==='-bl' || A[i]==='--block_length') Object.assign(o, {ssmls: {block: {length: parseInt(A[++i], 10)}}});
    else if(A[i]==='-bs' || A[i]==='--block_separator') Object.assign(o, {ssmls: {block: {separator: A[++i]}}});
    else txt = A[i];
  }
  await googletts(out, txt, o);
};
if(require.main===module) console(process.argv);
