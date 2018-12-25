#!/usr/bin/env node
const textToSpeech = require('@google-cloud/text-to-speech');
const musicMetadata = require('music-metadata');
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
const STDIO = [0, 1, 2];
const OPTIONS = {
  stdio: null,
  help: false,
  log: boolean(E['GOOGLETTS_LOG']||'0'),
  output: E['GOOGLETTS_OUTPUT']||'out.mp3',
  text: E['GOOGLETTS_TEXT'],
  retries: parseInt(E['GOOGLETTS_RETRIES']||'8', 10),
  credentials: {
    keyFilename: E['GOOGLETTS_CREDENTIALS']||E['GOOGLE_APPLICATION_CREDENTIALS']
  },
  acodec: E['GOOGLETTS_AUDIO_ACODEC']||'copy',
  audioConfig: {
    audioEncoding: E['GOOGLETTS_AUDIOCONFIG_AUDIOENCODING']||null,
    pitch: parseFloat(E['GOOGLETTS_AUDIOCONFIG_PITCH']||'0'),
    speakingRate: parseFloat(E['GOOGLETTS_AUDIOCONFIG_SPEAKINGRATE']||'1')
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
    emphasisLevel: E['GOOGLETTS_HEADING_EMPHASISLEVEL']||'strong',
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


// Format time in HH:MM:SS format.
function timeFormat(t) {
  var hh = Math.floor(t/3600).toString().padStart(2, '0');
  var mm = Math.floor((t%3600)/60).toString().padStart(2, '0');
  var ss = Math.floor(t%60).toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

// Get filename, without extension.
function pathFilename(pth) {
  return pth.substring(0, pth.length-path.extname(pth).length);
};

// Read file, return promise.
function fsReadFile(pth, o) {
  return new Promise((fres, frej) => fs.readFile(pth, o, (err, data) => {
    return err? frej(err):fres(data);
  }));
};

// Write file, return promise.
function fsWriteFile(pth, dat, o) {
  return new Promise((fres, frej) => fs.writeFile(pth, dat, o, (err) => {
    return err? frej(err):fres();
  }));
};

// Execute child process, return promise.
function cpExec(cmd, o) {
  var o = o||{}, stdio = o.log? o.stdio||STDIO:o.stdio||[];
  if(o.log) console.log('-cpExec:', cmd);
  if(o.stdio==null) return Promise.resolve({stdout: cp.execSync(cmd, {stdio})});
  return new Promise((fres, frej) => cp.exec(cmd, {stdio}, (err, stdout, stderr) => {
    return err? frej(err):fres({stdout, stderr});
  }));
};

// Get SSML from text.
function textSsml(txt, o) {
  var q = o.quote, h = o.heading, e = o.ellipsis, d = o.dash, n = o.newline;
  txt = txt.replace(/\"(.*?)\"/gm, (m, p1) => {
    var brk = `<break time="${q.breakTime}ms"/>`;
    var emp = `<emphasis level="${q.emphasisLevel}">"${p1}"</emphasis>`;
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

// Get sections for text.
function textSections(txt) {
  var re = /(=+)\s+(.*?)\s+\1/g;
  for(var i=0, title=null, top=null, secs=[]; (top=re.exec(txt))!=null;) {
    secs.push({title, content: txt.substring(i, top.index)});
    i = top.index; title = top[2];
  }
  secs.push({title, content: txt.substring(i)});
  return secs;
};

// Get voice config from options.
function voiceConfig(o)  {
  var n = o.name;
  var lc = n? n:(o.languageCode||VOICE.languageCode);
  lc = lc.substring(0, 2).toLowerCase()+'-';
  lc += lc.length>=5? lc.substring(3, 5).toUpperCase():'US';
  var sg = (o.ssmlGender||VOICE.ssmlGender).toUpperCase();
  if(lc===VOICE.languageCode && sg===VOICE.ssmlGender) n = n||VOICE.name;
  return {name: n, languageCode: lc, ssmlGender: sg};
};

// Write TTS audio to file.
function audiosWrite(out, ssml, tts, o) {
  var l = o.log, v = o.voice;
  var enc = path.extname(out).substring(1).toUpperCase();
  var cfg = Object.assign({audioEncoding: enc}, o.audioConfig);
  var req = {input: {ssml}, voice: v, audioConfig: cfg};
  return new Promise((fres, frej) => {
    tts.synthesizeSpeech(req, (err, res) => {
      if(err) return frej(err);
      fs.writeFile(out, res.audioContent, 'binary', (err) => {
        if(l) console.log('-audiosWrite:', out);
        if(err) return frej(err);
        fres(out);
      });
    });
  });
};

// Write TTS audio to file, with retries.
async function audiosRetryWrite(out, ssml, tts, o) {
  var err = null;
  for(var i=0; i<o.retries; i++) {
    try { return await audiosWrite(out, ssml, tts, o); }
    catch(e) { err = e; }
  }
  throw err;
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
  o.voice = voiceConfig(o.voice);
  if(o.log) console.log('-outputAudios:', out, ssmls.length);
  var pth = pathFilename(out), ext = path.extname(out);
  for(var i=0, I=ssmls.length, z=[]; i<I; i++)
    z[i] = audiosRetryWrite(`${pth}.${i}${ext}`, ssmls[i], tts, o);
  return Promise.all(z);
};

// Get durations of audio part files.
function outputDurations(auds) {
  var durs = [];
  for(var aud of auds)
    durs.push(musicMetadata.parseFile(aud).then(m => m.format.duration));
  return Promise.all(durs);
};

// Generate output audio file.
async function outputAudio(out, auds, o) {
  if(o.log) console.log('-outputAudio:', out, auds.length);
  var lst = tempy.file({extension: 'txt'}), dat = '';
  for(var aud of auds)
    dat += `file '${aud}'\n`;
  await fsWriteFile(lst, dat);
  var z = await cpExec(`ffmpeg -y -safe 0 -f concat -i "${lst}" -acodec ${o.acodec} "${out}"`, o);
  fs.unlink(lst, FN_NOP);
  return z;
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
  var out = out||o.output, c = o.credentials
  var txt = txt||o.input||(o.text? await fsReadFile(o.text, 'utf8'):null);
  if(o.log) console.log('@googletts:', out, txt);
  if(c.keyFilename) c.keyFilename = randomItem(c.keyFilename.split(';'));
  var tts = new textToSpeech.TextToSpeechClient(c);
  var ext = path.extname(out);
  var aud = tempy.file({extension: ext.substring(1)});
  var secs = textSections('\n'+txt), prts = [], ssmls = [];
  for(var sec of secs) {
    var secSsmls = outputSsmls(sec.content, o);
    prts.push(secSsmls.length);
    Array.prototype.push.apply(ssmls, secSsmls);
  }
  var auds = await outputAudios(aud, ssmls, tts, o);
  out = await outputAudio(out, auds, o);
  var durs = await outputDurations(auds);
  for(var i=0, j=0, t=0, tt=[], I=secs.length; i<I; i++) {
    tt[i] = {title: secs[i].title, time: timeFormat(t)};
    for(var p=0; p<prts[i]; p++)
      t += durs[j++];
  }
  for(var f of auds) fs.unlink(f, FN_NOP);
  if(o.log) console.log(' .timetable:', tt);
  return tt;
};

// Get options from arguments.
function options(o, k, a, i) {
  if(k==='--help') o.help = true;
  else if(k==='-o' || k==='--output') o.output= a[++i];
  else if(k==='-t' || k==='--text') o.text = a[++i];
  else if(k==='-l' || k==='--log') o.log = true;
  else if(k==='-r' || k==='--retries') o.retries = parseInt(a[++i], 10);
  else if(k==='-c' || k==='--credentials') _.set(o, 'credentials.keyFilename', a[++i]);
  else if(k==='-a' || k==='--acodec') _.set(o, 'acodec', a[++i]);
  else if(k==='-acae' || k==='--audioconfig_audioencoding') _.set(o, 'audioConfig.audioEncoding', a[++i]);
  else if(k==='-acp' || k==='--audioconfig_pitch') _.set(o, 'audioConfig.pitch', a[++i]);
  else if(k==='-acsr' || k==='--audioconfig_speakingrate') _.set(o, 'audioConfig.speakingRate', a[++i]);
  else if(k==='-vlc' || k==='--voice_languagecode') _.set(o, 'voice.languageCode', a[++i]);
  else if(k==='-vsg' || k==='--voice_ssmlgender') _.set(o, 'voice.ssmlGender', a[++i]);
  else if(k==='-vn' || k==='--voice_name') _.set(o, 'voice.name', a[++i]);
  else if(k==='-qbt' || k==='--quote_breaktime') _.set(o, 'quote.breakTime', parseFloat(a[++i]));
  else if(k==='-qel' || k==='--quote_emphasislevel') _.set(o, 'quote.emphasisLevel', a[++i]);
  else if(k==='-hbt' || k==='--heading_breaktime') _.set(o, 'heading.breakTime', parseFloat(a[++i]));
  else if(k==='-hbd' || k==='--heading_breakdiff') _.set(o, 'heading.breakDiff', parseFloat(a[++i]));
  else if(k==='-hel' || k==='--heading_emphasislevel') _.set(o, 'heading.emphasisLevel', a[++i]);
  else if(k==='-ebt' || k==='--ellipsis_breaktime') _.set(o, 'ellipsis.breakTime', parseFloat(a[++i]));
  else if(k==='-dbt' || k==='--dash_breaktime') _.set(o, 'dash.breakTime', parseFloat(a[++i]));
  else if(k==='-nbt' || k==='--newline_breaktime') _.set(o, 'newline.breakTime', parseFloat(a[++i]));
  else if(k==='-bl' || k==='--block_length') _.set(o, 'block.length', parseInt(a[++i], 10));
  else if(k==='-bs' || k==='--block_separator') _.set(o, 'block.separator', a[++i]);
  else o.input = a[i];
  return i+1;
};
googletts.options = options;
module.exports = googletts;

// Run on shell.
async function shell(a) {
  var o = {input: await getStdin()};
  for(var i=2, I=a.length; i<I;)
    i = options(o, a[i], a, i);
  if(o.help) return cp.execSync('less README.md', {cwd: __dirname, stdio: STDIO});
  var tt = await googletts(null, null, o);
  if(o.log || OPTIONS.log) return;
  for(var t of tt)
    if(t.title) console.log(t.time+' '+t.title);
};
if(require.main===module) shell(process.argv);
