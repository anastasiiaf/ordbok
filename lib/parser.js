const EventEmitter = require('events').EventEmitter;
const cheerio = require('cheerio');
const EntryObject = require('./entry');
const getParadigm = require('./paradigme');

function findEntry($, selector) {
  var word = '';
  var words = $(selector).find('a');
  $(words).each(function (index, element) {
    if (index < words.length - 1) {
      word += $(element).text() + ', ';
    } else {
      word += $(element).text();
    }
  });
  console.log('WORD', word);
  return word;
}

function findInterpretation($, tr, article) {
  var interpretation = [];
  $(article).find('span').remove('.oppsgramordklassevindu');
  if ($('.artikkelinnhold > span.utvidet', tr).children().length > 0) {
    // TODO: Check if the div.tydig exists if not there should be another way to handle the definition

    $('.artikkelinnhold > span.utvidet > div.tyding.utvidet', tr).each(function () {
      $(this)
        .find('.kompakt')
        .each(function () {
          $(this).remove();
        });

      var test = $(this).text();
      $(this)
        .children('.tyding')
        .each(function () {
          $(this)
            .find('.kompakt')
            .each(function () {
              $(this).remove();
            });

          test += $(this).text();
        });

      if (test !== null) {
        interpretation.push({ definition: test });
      }
    });
  }

  if (interpretation.length === 0) {
    var short = $(article).find('.utvidet').clone().children().remove().end().text();
    interpretation.push({ definition: short });
  }

  return interpretation;
}

function findOrigin($, article) {
  // Removing the classes kompakt and tydingC failes if the classes are missing.
  // TODO: check if the classes exists
  //        if($(".artikkelinnhold > span.utvidet", tr).children().length > 0){
  //          // Since there is more levels
  //          $(article).find(".tydingC").each(function(){
  //            $(this).remove();
  //          });
  //          $(article).find(".kompakt").each(function(){
  //            $(this).remove();
  //          });
  //        }

  // ORIGIN OF THE WORD
  // CLEAN UP SOME
  $(article).find('span').remove('.utvidet');

  article = article.html().toString();
  article = article.replace(/<style>(.*)<\/style>/g, '');
  article = article.replace(/<span style="font-style:[ \s]italic">(.*)+?<\/span>/g, '$1');

  var origin = $(article).clone().children().remove().end().text();
  origin = origin.replace(/'/g, '"');
  origin = origin.trim();

  return origin;
}

function findWord($, tr, lang, callback) {
  const paradigmId = tr.find('span.oppslagsord.b').attr('id');
  console.log('PARADIGM', paradigmId);
  const article = tr.find('.artikkelinnhold');
  const word = findEntry($, tr.find('.oppslagdiv'));
  let entry = new EntryObject(word);

  // PART OF SPEECH
  entry.partOfSpeech = tr.find('.oppsgramordklasse').text();

  // INTERPRETATION
  entry.interpretation = findInterpretation($, tr, article);

  // ORIGIN
  entry.wordsOrigin = findOrigin($, article);

  getParadigm(paradigmId, lang, function (err, data) {
    if (err) {
      return callback(err);
    }
    entry.paradigm = data;

    return callback(null, entry.getObject());
  });
}

function findWords($, selector, callback) {
  let glossary = [];
  const queController = new EventEmitter();
  let workList = [];
  let queCounter = 0;
  const lang = selector.attr('id').replace('byttut', '');
  console.log('LANG ', lang);

  queController.on('finished', function () {
    return callback(null, glossary);
  });

  //console.log($(selector));

  $(selector)
    .find('tr')
    .each(function (index, element) {
      var tr = $(element);

      if (tr.attr('valign')) {
        workList.push(tr);
      }
    });

  if (workList.length === 0) {
    $(selector)
      .find('div')
      .each(function (index, element) {
        var div = $(element);

        if (div.hasClass('artikkel')) {
          console.log('DIV SELECTOR');
          workList.push(div);
        }
      });
  }

  queCounter = workList.length;
  console.log('WORKLIST SIZE', queCounter);
  console.log(workList);
  workList.forEach(function (tr) {
    console.log('INSIDE WORKLIST');
    //console.log(tr);
    findWord($, tr, lang, function (err, entry) {
      if (err) {
        return callback(err, null);
      }
      queCounter--;
      glossary.push(entry);

      if (queCounter === 0) {
        queController.emit('finished');
      }
    });
  });
}

function parseData(data, callback) {
  //console.log('DATA IN PASRER', data);
  const queController = new EventEmitter();
  let result = {};
  const $ = cheerio.load(data);
  const langList = [
    ['bokmal', '#byttutBM'],
    ['nynorsk', '#byttutNN'],
  ];
  let queCounter = langList.length;
  const results = 2 - $('.ikkefunnet').length;
  console.log(results);
  let notFound = '';

  if (results === 1) {
    // Find the node "ikkefunnet" and get its sibling(the title) to find what lang is missing
    notFound = $('.ikkefunnet').prev().find('h1').text().toLocaleLowerCase().replace('å', 'a');
    //console.log(notFound);
  } else if (results === 0) {
    // There is no results, return the languages as keys with empty array value
    result[langList[0][0]] = [];
    result[langList[1][0]] = [];
    return callback(null, result);
  }

  queController.on('finished', function () {
    return callback(null, result);
  });
  console.log(langList);
  langList.forEach(function (lang) {
    var thisLang = lang;
    console.log(!notFound.includes(lang[0]));
    // Do not parse if there is no word for that language
    if (!notFound.includes(lang[0])) {
      console.log('I am here');
      console.log($(thisLang[1]));
      // console.log($); */
      console.log('======================');

      findWords($, $(thisLang[1]), function (err, data) {
        if (err) {
          console.log('ERROR');
          return callback(err, null);
        }
        queCounter--;

        result[thisLang[0]] = data;
        console.log('CALLBACK');

        if (queCounter === 0) {
          queController.emit('finished');
        }
      });
    } else {
      queCounter--;

      result[thisLang[0]] = [];
      if (queCounter === 0) {
        queController.emit('finished');
      }
    }
  });
}

module.exports = function (data, callback) {
  parseData(data, function (err, result) {
    if (err) {
      return callback(err, null);
    }
    return callback(null, result);
  });
};
