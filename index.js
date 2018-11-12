#!/usr/bin/env node
const textToSpeech = require('@google-cloud/text-to-speech');
const randomItem = require('random-item');
const getStdin = require('get-stdin');
const boolean = require('boolean');
const tempy = require('tempy');
const _ = require('lodash');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');


// Global variables
const E = process.env;
const CP = {
  sync: true,
  stdio: [0, 1, 2]
};
const OPTIONS = {
  log: boolean(E['GOOGLETTS_LOG']||'0'),
  credentials: {
    keyFilename: E['GOOGLE_APPLICATION_CREDENTIALS']
  },
  audio: {
    acodec: E['GOOGLETTS_AUDIO_ACODEC']||'copy',
    cp: null
  },
  voice: {
    name:  E['GOOGLETTS_VOICE_NAME'],
    languageCode: E['GOOGLETTS_VOICE_LANGUAGECODE'],
    ssmlGender: E['GOOGLETTS_VOICE_SSMLGENDER']
  },
  quote: {
    breakTime: parseFloat(E['GOOGLETTS_QUOTE_BREAKTIME']||'250'),
    emphasisLevel: E['GOOGLETTS_QUOTE_EMPHASISLEVEL']||'moderate'
  },
  heading: {
    breakTime: parseFloat(E['GOOGLETTS_HEADING_BREAKTIME']||'4000'),
    breakDiff: parseFloat(E['GOOGLETTS_HEADING_BREAKDIFF']||'250'),
    emphasisLevel: parseFloat(E['GOOGLETTS_HEADING_EMPHASISLEVEL']||'strong'),
  },
  ellipsis: {
    breakTime: parseFloat(E['GOOGLETTS_ELLIPSIS_BREAKTIME']||'1500')
  },
  dash: {
    breakTime: parseFloat(E['GOOGLETTS_DASH_BREAKTIME']||'500')
  },
  newline: {
    breakTime: parseFloat(E['GOOGLETTS_NEWLINE_BREAKTIME']||'1000')
  },
  block: {
    length: parseFloat(E['GOOGLETTS_BLOCK_LENGTH']||'5000'),
    separator: E['GOOGLETTS_BLOCK_SEPARATOR']||'.'
  },
};
const VOICE = {
  name: 'en-US-Wavenet-D',
  languageCode: 'en-US',
  ssmlGender: 'NEUTRAL'
};
const FN_NOP = () => 0;


// Get filename, without extension.
function pathFilename(pth) {
  return pth.substring(0, pth.length-path.extname(pth).length);
};

// Write to file, return promise.
function fsWriteFile(pth, dat, o) {
  return new Promise((fres, frej) => {
    fs.writeFile(pth, dat, o, (err) => {
      if(err) frej(err);
      else fres(pth);
    });
  });
};

// Execute child process, return promise.
function cpExec(cmd, o) {
  if(o && o.sync) return Promise.resolve({stdout: cp.execSync(cmd, o)});
  return new Promise((fres, frej) => {
    cp.exec(cmd, o, (err, stdout, stderr) => {
      if(err) frej(err);
      else fres({stdout, stderr});
    });
  });
};

// Get SSML from text.
function textSsml(txt, o) {
  var q = o.quote, h = o.heading, e = o.ellipsis, d = o.dash, n = o.newline;
  txt = txt.replace(/([\'\"])(.*?)\1/gm, (m, p1, p2) => {
    var brk = `<break time="${q.breakTime}ms"/>`;
    var emp = `<emphasis level="${q.emphasisLevel}">${p1}${p2}${p1}</emphasis>`;
    return brk+emp+brk;
  });
  txt = txt.replace(/(=+)\s(.*?)\s\1/g, (m, p1, p2) => {
    var brk = `<break time="${h.breakTime-p1.length*h.breakDiff}ms"/>`;
    var emp = `<emphasis level="${h.emphasisLevel}">${p2}</emphasis>`;
    return brk+'Topic '+emp+brk;
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
  var b = o.block;
  for(var end=b.length;;) {
    end = Math.floor(0.75*end);
    var i = txt.lastIndexOf(b.separator, end)+1;
    i = i>0? i:Math.min(txt.length, end);
    var ssml = textSsml(txt.substring(0, i), o);
    if(ssml.length<b.length) break;
  }
  return [ssml, txt.substring(i)];
};

// Write TTS audio to file.
function audiosWrite(out, ssml, tts, o) {
  var l = o.log, v = o.voice;
  var enc = path.extname(out).substring(1).toUpperCase();
  var req = {input: {ssml}, voice: v, audioConfig: {audioEncoding: enc}};
  return new Promise((fres, frej) => {
    tts.synthesizeSpeech(req, (err, res) => {
      if(err) return frej(err);
      fs.writeFile(out, res.audioContent, 'binary', (err) => {
        if(l) console.log('audiosWrite:', out);
        if(err) return frej(err);
        fres(out);
      });
    });
  });
};

// Generate output SSML parts.
function outputSsmls(txt, o) {
  for(var i=0, z=[]; txt; i++) {
    var [ssml, txt] = textSsmlBlock(txt, o);
    z[i] = ssml;
  }
  return z;
};

// Generate output audio part files.
function outputAudios(out, ssmls, tts, o) {
  var l = o.log, v = o.voice;
  if(l) console.log('outputAudios:', out, ssmls.length);
  if(v.name) v.languageCode = v.name.substring(5);
  v.languageCode = v.languageCode||VOICE_LANGUAGECODE;
  v.ssmlGender = v.ssmlGender||VOICE_SSMLGENDER;
  if(v.languageCode===VOICE_LANGUAGECODE && v.ssmlGender===VOICE_SSMLGENDER) {
    v.name = v.name||VOICE_NAME;
  }
  var pth = pathFilename(out), ext = path.extname(out);
  for(var i=0, I=ssmls.length, z=[]; i<I; i++)
    z[i] = audiosWrite(`${pth}.${i}${ext}`, ssmls[i], tts, o);
  return Promise.all(z);
};

// Generate output audio file.
function outputAudio(out, auds, o) {
  var l = o.log, a = o.audio;
  var cmd = `ffmpeg -y -i "concat:${auds.join('|')}" -acodec ${a.acodec} "${out}"`;
  if(l) { console.log('outputAudio:', out, auds.length); console.log('-cpExec:', cmd); }
  return cpExec(cmd, l? Object.assign({}, a.cp, CP):a.cp).then(() => out);
};

/**
 * Generate speech audio from super long text through machine (via ["Google TTS"], ["ffmpeg"]).
 * @param {string} out output audio file.
 * @param {string} txt input text.
 * @param {object} o options.
 * @returns promise <out>.
 */
async function googletts(out, txt, o) {
  var o = _.merge({}, OPTIONS, o);
  var l = o.log, c = o.credentials;
  if(l) console.log('@googletts:', out, txt);
  if(c.keyFilename) c.keyFilename = randomItem(c.keyFilename.split(';'));
  var tts = new textToSpeech.TextToSpeechClient(c);
  var pth = pathFilename(out), ext = path.extname(out);
  var aud = tempy.file({extension: ext.substring(1)});
  var ssmls = outputSsmls('\n'+txt, o);
  var auds = await outputAudios(aud, ssmls, tts, o);
  out = await outputAudio(out, auds, o);
  for(var f of auds) fs.unlink(f, FN_NOP);
  return out;
};
module.exports = googletts;

// Run on shell.
async function shell(A) {
  var txt = await getStdin();
  var out = 'out.mp3', o = {};
  for(var i=2, I=A.length; i<I; i++) {
    if(A[i]==='--help') return cp.execSync('less README.md', {cwd: __dirname, stdio: [0, 1, 2]});
    else if(A[i]==='-o' || A[i]==='--output') out = A[++i];
    else if(A[i]==='-t' || A[i]==='--text') txt = fs.readFileSync(A[++i], 'utf8');
    else if(A[i]==='-l' || A[i]==='--log') Object.assign(o, {log: true});
    else if(A[i]==='-c' || A[i]==='--credentials') Object.assign(o, {credentials: {keyFilename: A[++i]}});
    else if(A[i]==='-aa' || A[i]==='--audio_acodec') Object.assign(o, {audio: {acodec: A[++i]}});
    else if(A[i]==='-vlc' || A[i]==='--voice_languagecode') Object.assign(o, {voice: {languageCode: A[++i]}});
    else if(A[i]==='-vsg' || A[i]==='--voice_ssmlgender') Object.assign(o, {voice: {ssmlGender: A[++i]}});
    else if(A[i]==='-vn' || A[i]==='--voice_name') Object.assign(o, {voice: {name: A[++i]}});
    else if(A[i]==='-qbt' || A[i]==='--quote_breaktime') Object.assign(o, {quote: {breakTime: parseFloat(A[++i])}});
    else if(A[i]==='-qel' || A[i]==='--quote_emphasislevel') Object.assign(o, {quote: {emphasisLevel: A[++i]}});
    else if(A[i]==='-hbt' || A[i]==='--heading_breaktime') Object.assign(o, {heading: {breakTime: parseFloat(A[++i])}});
    else if(A[i]==='-hbd' || A[i]==='--heading_breakdiff') Object.assign(o, {heading: {breakDiff: parseFloat(A[++i])}});
    else if(A[i]==='-hel' || A[i]==='--heading_emphasislevel') Object.assign(o, {heading: {emphasisLevel: A[++i]}});
    else if(A[i]==='-ebt' || A[i]==='--ellipsis_breaktime') Object.assign(o, {ellipsis: {breakTime: parseFloat(A[++i])}});
    else if(A[i]==='-dbt' || A[i]==='--dash_breaktime') Object.assign(o, {dash: {breakTime: parseFloat(A[++i])}});
    else if(A[i]==='-nbt' || A[i]==='--newline_breaktime') Object.assign(o, {newline: {breakTime: parseFloat(A[++i])}});
    else if(A[i]==='-bl' || A[i]==='--block_length') Object.assign(o, {block: {length: parseInt(A[++i], 10)}});
    else if(A[i]==='-bs' || A[i]==='--block_separator') Object.assign(o, {block: {separator: A[++i]}});
    else txt = A[i];
  }
  await googletts(out, txt, o);
};
if(require.main===module) shell(process.argv);
