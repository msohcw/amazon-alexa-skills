'use strict';

const Alexa = require('alexa-sdk');
const request = require('request');
const firebase = require('firebase');

var config = {
      apiKey: "*** REMOVED ***",
      authDomain: "glass-counter.firebaseapp.com",
      databaseURL: "https://glass-counter.firebaseio.com",
      projectId: "glass-counter",
      storageBucket: "glass-counter.appspot.com",
      messagingSenderId: "814173241934"
    };
firebase.initializeApp(config);

const database = firebase.database();

const APP_ID = undefined;  // TODO replace with your app ID (OPTIONAL).

const languageStrings = {
    'en': {
        translation: {
            SKILL_NAME: 'Glass Counter',
            HELP_MESSAGE: 'Say Add One to add a glass. Say How Many Today to get the number so far',
            STOP_MESSAGE: 'Goodbye!',
            DRINK_MESSAGE: 'Okay. Keep drinking to stay hydrated.',
            ZERO_MESSAGE: "You haven't drunk any glasses of water today.",
            COUNT_MESSAGE: 'You have finished %s glasses of water today.',
            EIGHT_MESSAGE: 'Good job on drinking the recommended 8 glasses a day!'
        },
    },
};

const handlers = {
    'LaunchRequest': function () {
        this.emit('GetCountIntent');
    },
    'GetCountIntent': function () {
        var that = this;
        var reference = this.handler.userId.replace(/\[|\.|\]/g, "_")
        database.ref('/users/' + reference).once('value').then(function(snapshot){
          var last = snapshot.val();
          if(last === null || last['day'] != (new Date()).getDay()){
            database.ref('users/' + reference).set({
              'count': 0,
              'day' : (new Date()).getDay()
            });
            that.emit(':tell', that.t('ZERO_MESSAGE'));
          }else{
            that.emit(':tell', that.t('COUNT_MESSAGE').replace('%s', last['count']));
          }
        });
    },
    'AddOneIntent': function () {
        var that = this;
        var reference = this.handler.userId.replace(/\[|\.|\]/g, "_")
        database.ref('/users/' + reference).once('value').then(function(snapshot){
          var last = snapshot.val();
          if(last === null || last['day'] != (new Date()).getDay()){
            database.ref('users/' + reference).set({
              'count': 1,
              'day' : (new Date()).getDay()
            });
          }else{
            database.ref('users/' + reference).set({
              'count': last['count'] + 1,
              'day' : (new Date()).getDay()
            });
          }
          if(last['count'] == 8){
            that.emit(':tell', that.t('EIGHT_MESSAGE'));
          }else{
            that.emit(':tell', that.t('DRINK_MESSAGE'));
          }
        });
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = this.t('HELP_MESSAGE');
        const reprompt = this.t('HELP_MESSAGE');
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
};

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.userId =  event.session.user.userId
    // To enable string internationalization (i18n) features, set a resources object.
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
