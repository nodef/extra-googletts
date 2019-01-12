#!/usr/bin/env node
const textToSpeech = require('@google-cloud/text-to-speech');
const gcpconfig = require('extra-gcpconfig');
const musicMetadata = require('music-metadata');
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
  log: boolean(E['TTS_LOG']||'0'),
  output: E['TTS_OUTPUT']||'out.mp3',
  text: E['TTS_TEXT']||null,
  retries: parseInt(E['TTS_RETRIES']||'8', 10),
  acodec: E['TTS_ACODEC']||'copy',
  audio: {
    encoding: E['TTS_AUDIO_ENCODING']||null,
    frequency: parseInt(E['TTS_AUDIO_FREQUENCY'], 10)
  },
  language: {
    code: E['TTS_LANGUAGE_CODE']||'en-US'
  },
  voice: {
    name:  E['TTS_VOICE_NAME']||null,
    gender: E['TTS_VOICE_GENDER']||'neutral',
    pitch: parseFloat(E['TTS_VOICE_PITCH']||'0'),
    rate: parseFloat(E['TTS_VOICE_RATE']||'1'),
    volume: parseFloat(E['TTS_VOICE_VOLUME']||'0')
  },
  quote: {
    break: parseFloat(E['TTS_QUOTE_BREAK']||'250'),
    emphasis: E['TTS_QUOTE_EMPHASIS']||'moderate'
  },
  heading: {
    break: parseFloat(E['TTS_HEADING_BREAK']||'4000'),
    difference: parseFloat(E['TTS_HEADING_DIFFERENCE']||'250'),
    emphasis: E['TTS_HEADING_EMPHASIS']||'strong',
  },
  ellipsis: {
    break: parseFloat(E['TTS_ELLIPSIS_BREAK']||'1500')
  },
  dash: {
    break: parseFloat(E['TTS_DASH_BREAK']||'500')
  },
  newline: {
    break: parseFloat(E['TTS_NEWLINE_BREAK']||'1000')
  },
  block: {
    separator: E['TTS_BLOCK_SEPARATOR']||'.',
    length: parseFloat(E['TTS_BLOCK_LENGTH']||'5000')
  },
  config: null,
  params: null
};
const AUDIO_ENCODING = new Map([
  ['wav', 'LINEAR16'],
  ['mp3', 'MP3'],
  ['ogg', 'OGG_OPUS']
]);
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
  // txt = txt.replace(/\s*&\s*/g, ' and ');
  txt = txt.replace(/\"(.*?)\"/gm, (m, p1) => {
    var brk = `<break time="${q.break}ms"/>`;
    var emp = `<emphasis level="${q.emphasis}">"${p1}"</emphasis>`;
    return brk+emp+brk;
  });
  txt = txt.replace(/(=+)\s(.*?)\s\1/g, (m, p1, p2) => {
    var brk = `<break time="${h.break-p1.length*h.difference}ms"/>`;
    var emp = `<emphasis level="${h.emphasis}">${p2}</emphasis>`;
    return brk+'Topic '+emp+brk;
  });
  // txt = txt.replace(/\((.*?)\)/gm, '<emphasis level="reduced">($1)</emphasis>');
  // txt = txt.replace(/\[(.*?)\]/gm, '<emphasis level="reduced">[$1]</emphasis>');
  txt = txt.replace(/\.\.\./g, `<break time="${e.break}ms"/>...`);
  txt = txt.replace(/\—/g, `<break time="${d.break}ms"/>—`);
  txt = txt.replace(/(\r?\n)+/gm, `<break time="${n.break}ms"/>\n`);
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

// Get TTS synthesize speech params.
function ttsParams(out, txt, o) {
  var vn = o.voice.name||null;
  var lc = vn? vn:(o.language.code||OPTIONS.language.code);
  lc = lc.substring(0, 2).toLowerCase()+'-';
  lc += lc.length>=5? lc.substring(3, 5).toUpperCase():'US';
  var vg = (o.voice.gender||OPTIONS.voice.gender).toUpperCase();
  if(lc===OPTIONS.language.code && vg===OPTIONS.voice.gender) vn = vn||OPTIONS.voice.name;
  var typ = (o.audio.encoding||path.extname(out).substring(1)).toLowerCase();
  var ae = o.audio.encoding||AUDIO_ENCODING.get(typ)||'MP3';
  return {
    input: {ssml: txt}, voice: {languageCode: lc, ssmlGender: vg, name: vn},
    audioConfig: {
      audioEncoding: ae, speakingRate: o.voice.rate||1, pitch: o.voice.pitch||0,
      volumeGainDb: o.voice.volume||0, sampleRateHertz: o.audio.frequency||null
    }
  };
};

// Write TTS audio to file.
function audiosWrite(out, ssml, tts, o) {
  var l = o.log, req = o.params; req.input.ssml = ssml;
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
  if(o.log) console.log('@googletts:', out, txt);
  o.params = o.params||ttsParams(out, txt, o);
  var tts = new textToSpeech.TextToSpeechClient(gcpconfig(o.config));
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
  for(var i=0, j=0, t=0, toc=[], I=secs.length; i<I; i++) {
    toc[i] = {title: secs[i].title, time: timeFormat(t)};
    for(var p=0; p<prts[i]; p++)
      t += durs[j++];
  }
  for(var f of auds) fs.unlink(f, FN_NOP);
  if(o.log) console.log(' .toc:', toc);
  return toc;
};

// Get options from arguments.
function options(o, k, a, i) {
  var e = k.indexOf('='), v = null, bool = () => true, str = () => a[++i];
  if(e>=0) { v = k.substring(e+1); bool = () => boolean(v); str = () => v; k = k.substring(o, e); }
  o.config = o.config||{};
  if(k==='--help') o.help = bool();
  else if(k==='-o' || k==='--output') o.output= str();
  else if(k==='-t' || k==='--text') o.text = str();
  else if(k==='-l' || k==='--log') o.log = bool();
  else if(k==='-r' || k==='--retries') o.retries = parseInt(str(), 10);
  else if(k==='-a' || k==='--acodec') _.set(o, 'acodec', str());
  else if(k==='-ae' || k==='--audio_encoding') _.set(o, 'audio.encoding', str());
  else if(k==='-lc' || k==='--language_code') _.set(o, 'language.code', str());
  else if(k==='-vn' || k==='--voice_name') _.set(o, 'voice.name', str());
  else if(k==='-vg' || k==='--voice_gender') _.set(o, 'voice.gender', str());
  else if(k==='-vp' || k==='--voice_pitch') _.set(o, 'voice.pitch', parseFloat(str()));
  else if(k==='-vr' || k==='--voice_rate') _.set(o, 'voice.rate', parseFloat(str()));
  else if(k==='-qb' || k==='--quote_break') _.set(o, 'quote.break', parseFloat(str()));
  else if(k==='-qe' || k==='--quote_emphasis') _.set(o, 'quote.emphasis', str());
  else if(k==='-hb' || k==='--heading_break') _.set(o, 'heading.break', parseFloat(str()));
  else if(k==='-hd' || k==='--heading_difference') _.set(o, 'heading.difference', parseFloat(str()));
  else if(k==='-he' || k==='--heading_emphasis') _.set(o, 'heading.emphasis', str());
  else if(k==='-eb' || k==='--ellipsis_break') _.set(o, 'ellipsis.break', parseFloat(str()));
  else if(k==='-db' || k==='--dash_break') _.set(o, 'dash.break', parseFloat(str()));
  else if(k==='-nb' || k==='--newline_break') _.set(o, 'newline.break', parseFloat(str()));
  else if(k==='-bs' || k==='--block_separator') _.set(o, 'block.separator', str());
  else if(k==='-bl' || k==='--block_length') _.set(o, 'block.length', parseInt(str(), 10));
  else if(k.startsWith('-c')) gcpconfig.options(o.config, '-'+k.substring(2), a, i);
  else if(k.startsWith('--config_')) gcpconfig.options(o.config, '--'+k.substring(9), a, i);
  else o.argv = a[i];
  return i+1;
};
googletts.options = options;
module.exports = googletts;

// Run on shell.
async function shell(a) {
  var o = {argv: await getStdin()};
  for(var i=2, I=a.length; i<I;)
    i = options(o, a[i], a, i);
  if(o.help) return cp.execSync('less README.md', {cwd: __dirname, stdio: STDIO});
  var txt = o.text? fs.readFileSync(o.text, 'utf8'):o.argv||'';
  var out = o.output||'out.mp3';
  var toc = await googletts(out, txt, o);
  if(o.log || OPTIONS.log) return;
  for(var c of toc)
    if(c.title) console.log(c.time+' '+c.title);
};
if(require.main===module) shell(process.argv);
