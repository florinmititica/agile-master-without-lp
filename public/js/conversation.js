// The ConversationPanel module is designed to handle
// all display and behaviors of the conversation column of the app.
/* eslint no-unused-vars: "off" */
/* global Api: true, Common: true*/

var ConversationPanel = (function() {

  var settings = {
    selectors: {
      chatBox: '#scrollingChat',
      fromUser: '.from-user',
      fromWatson: '.from-watson',
      latest: '.latest'
    },
    authorTypes: {
      user: 'user',
      watson: 'watson'
    }
  };

  // Publicly accessible methods defined
  return {
    init: init,
    inputKeyDown: inputKeyDown
  };

  // Initialize the module
  function init() {
    Api.sendRequest( 'initial message', null );
    chatUpdateSetup();
    setupInputBox();
  
    //Setting the sessionID
    //localStorage.clear();
    if(!localStorage){
      localStorage.setItem("sessionID", "0");
      localStorage.setItem("questionID", "0");
    }
    else
    {
      var temp = localStorage.getItem("sessionID");
      temp++;
      localStorage.setItem("sessionID", temp);
      localStorage.setItem("questionID", 1);
    }
  }


  // Set up callbacks on payload setters in Api module
  // This causes the displayMessage function to be called when messages are sent / received
  function chatUpdateSetup() {
    var currentRequestPayloadSetter = Api.setRequestPayload;
    Api.setRequestPayload = function(newPayloadStr) {
      currentRequestPayloadSetter.call(Api, newPayloadStr);
      displayMessage(JSON.parse(newPayloadStr), settings.authorTypes.user);
    };

    var currentResponsePayloadSetter = Api.setResponsePayload;
    Api.setResponsePayload = function(newPayloadStr) {
      currentResponsePayloadSetter.call(Api, newPayloadStr);
      displayMessage(JSON.parse(newPayloadStr), settings.authorTypes.watson);
    };
  }

// Set up the input box to underline text as it is typed
  // This is done by creating a hidden dummy version of the input box that
  // is used to determine what the width of the input text should be.
  // This value is then used to set the new width of the visible input box.
  function setupInputBox() {
    var input = document.getElementById('textInput');
    var dummy = document.getElementById('textInputDummy');
    var minFontSize = 14;
    var maxFontSize = 16;
    var minPadding = 4;
    var maxPadding = 6;

    // If no dummy input box exists, create one
    if (dummy === null) {
      var dummyJson = {
        'tagName': 'div',
        'attributes': [{
          'name': 'id',
          'value': 'textInputDummy'
        }]
      };

      dummy = Common.buildDomElement(dummyJson);
      document.body.appendChild(dummy);
    }

    function adjustInput() {
      if (input.value === '') {
        // If the input box is empty, remove the underline
        input.classList.remove('underline');
        input.setAttribute('style', 'width:' + '100%');
        input.style.width = '100%';
      } else {
        // otherwise, adjust the dummy text to match, and then set the width of
        // the visible input box to match it (thus extending the underline)
        input.classList.add('underline');
        var txtNode = document.createTextNode(input.value);
        ['font-size', 'font-style', 'font-weight', 'font-family', 'line-height',
          'text-transform', 'letter-spacing'].forEach(function(index) {
            dummy.style[index] = window.getComputedStyle(input, null).getPropertyValue(index);
          });
        dummy.textContent = txtNode.textContent;

        var padding = 0;
        var htmlElem = document.getElementsByTagName('html')[0];
        var currentFontSize = parseInt(window.getComputedStyle(htmlElem, null).getPropertyValue('font-size'), 10);
        if (currentFontSize) {
          padding = Math.floor((currentFontSize - minFontSize) / (maxFontSize - minFontSize) * (maxPadding - minPadding) + minPadding);
        } else {
          padding = maxPadding;
        }

        var widthValue = ( dummy.offsetWidth + padding) + 'px';
        input.setAttribute('style', 'width:' + widthValue);
        input.style.width = widthValue;
      }
    }

    // Any time the input changes, or the window resizes, adjust the size of the input box
    input.addEventListener('input', adjustInput);
    window.addEventListener('resize', adjustInput);

    // Trigger the input event once to set up the input box and dummy element
    Common.fireEvent(input, 'input');
  }

  // Display a user or Watson message that has just been sent/received
  function displayMessage(newPayload, typeValue) {
    var isUser = isUserMessage(typeValue);
    var textExists = (newPayload.input && newPayload.input.text) || (newPayload.output && newPayload.output.text);
    if (isUser !== null && textExists) {
      // Create new message DOM element
      var messageDivs = buildMessageDomElements(newPayload, isUser);
      var chatBoxElement = document.querySelector(settings.selectors.chatBox);
      var previousLatest = chatBoxElement.querySelectorAll((isUser ? settings.selectors.fromUser : settings.selectors.fromWatson) + settings.selectors.latest);
      // Previous "latest" message is no longer the most recent
      if (previousLatest) {
        Common.listForEach(previousLatest, function(element) {
          element.classList.remove('latest');
        });
      }

      messageDivs.forEach(function(currentDiv) {
        chatBoxElement.appendChild(currentDiv);
        // Class to start fade in animation
        currentDiv.classList.add('load');
      });

      // Move chat to the most recent messages when new messages are added
      scrollToChatBottom();
      console.log(localStorage);
    }
  }

  // Checks if the given typeValue matches with the user "name", the Watson "name", or neither
  // Returns true if user, false if Watson, and null if neither
  // Used to keep track of whether a message was from the user or Watson
  function isUserMessage(typeValue) {
    if (typeValue === settings.authorTypes.user) {
      return true;
    } else if (typeValue === settings.authorTypes.watson) {
      return false;
    }
    return null;
  }

  // Constructs new DOM element from a message payload
  function buildMessageDomElements(newPayload, isUser) {
    var textArray = isUser ? newPayload.input.text : newPayload.output.text;
    if (Object.prototype.toString.call( textArray ) !== '[object Array]') {
      textArray = [textArray];
    }
    var messageArray = [];


    textArray.forEach(function(currentText) {
      if (currentText) {
        var messageJson = {
          // <div class='segments'>
          'tagName': 'div',
          'classNames': ['segments'],
          'children': [{
            // <div class='from-user/from-watson latest'>
            'tagName': 'div',
            'classNames': [(isUser ? 'from-user' : 'from-watson'), 'latest', ((messageArray.length === 0) ? 'top' : 'sub')],
            'children': [{
              // <div class='message-inner'>
              'tagName': 'div',
              'classNames': ['message-inner'],
              'children': [{
                // <p>{messageText}</p>
                'tagName': 'p',
                'text': currentText
              }]
            }]
          }]
        };


        function extraOutput(newHtml){
          var messageJson2 = {
            // <div class='segments'>
            'tagName': 'div',
            'classNames': ['segments'],
            'children': [{
              // <div class='from-user/from-watson latest'>
              'tagName': 'div',
              'classNames': [(isUser ? 'from-user' : 'from-watson'), 'latest', ((messageArray.length === 0) ? 'top' : 'sub')],
              'children': [{
                // <div class='message-inner'>
                'tagName': 'div',
                'classNames': ['message-inner'],
                'children': [{
                  //  html injection
                  'html': newHtml
                }]
              }]
            }]
          };
          return messageJson2;
        }



        messageArray.push(Common.buildDomElement(messageJson));
      }

      //display the scrum diagram
      if(isUser==false){
        if(currentText=="The scrum diagram displays an overview of scrum."){
          messageArray.push(Common.buildDomElement(extraOutput("<img id='scrumDiagram' src='../img/scrum-framework-diagram.png' alt='Scrum diagram' style='width: 100%;'>")));
        }
      }

      //Function for disabling buttons
      var disableButtons = function(){
        var elems = document.getElementsByClassName("myButtons");
        for(var i = 0; i < elems.length; i++) {
            elems[i].disabled = true;
        }
      }

      //display lists based on Watson's context (Watson doesn't have this functionality)
      if(isUser==false){

        if(Api.getResponsePayload().context.list.length>0){
          var list = Api.getResponsePayload().context.list;
          var htmlString = "<ul>";
          var htmlString1 = "<li>";
          var htmlString2 = "</li>";
          var htmlString3 = "</ul>";
          for (var i=0;i<list.length;i++){
            htmlString = htmlString.concat(htmlString1+list[i]+htmlString2);
          }
          htmlString = htmlString.concat(htmlString3);
          messageArray.push(Common.buildDomElement(extraOutput(htmlString)));

        }
      }

      //Log user input
      if(isUser == true && newPayload.input.text!="initial message"){
        //Setting the questionID
        var localQuestionID = localStorage.getItem("questionID");
        //Get the session ID
        var localSessionID = localStorage.getItem("sessionID") - 1;
        //Concat the input temaplte
        var questionTemplate = localSessionID + "_" + localQuestionID + "_question";
        //Store the input in local storage
        localStorage.setItem(questionTemplate, newPayload.input.text);

        //localQuestionID++;
        localStorage.setItem("questionID", localQuestionID);
      }

      //Log answer/question level 
      if(isUser == false && Api.getResponsePayload().output.text[0]!="Hi, I'm your Scrum Assistant, you can ask me about the scrum methodology"){
        //Setting the questionID
        var localQuestionID = localStorage.getItem("questionID");
        //Get the session ID
        var localSessionID = localStorage.getItem("sessionID") - 1;
        //Concat the level temaplte
        var levelTemplate = localSessionID + "_" + localQuestionID + "_level";
        //Store the level in local storage
        localStorage.setItem(levelTemplate, Api.getResponsePayload().context.level[0]);

      }

      //Log Watson response 
      if(isUser == false && Api.getResponsePayload().output.text[0]!="Hi, I'm your Scrum Assistant, you can ask me about the scrum methodology"){
        //Get the questionID
        var localQuestionID = localStorage.getItem("questionID");
        //Get the session ID
        var localSessionID = localStorage.getItem("sessionID") - 1;
        //Concat the answer temaplte
        var answerTemplate = localSessionID + "_" + localQuestionID + "_answer";
        //Store the answer in local storage
        localStorage.setItem(answerTemplate, Api.getResponsePayload().output.text[0]);

        //Increment the questionID
        localQuestionID++;
        //Store it again in local storage
        localStorage.setItem("questionID", localQuestionID);

      }

      // //display buttons based on Watson's context
      // if(isUser==false){
      //   disableButtons();

      //   if(Api.getResponsePayload().context.buttonsLabel.length>0){
      //     var buttons = Api.getResponsePayload().context.buttonsLabel;
      //     var onclicklist = Api.getResponsePayload().context.onclick;
      //     var htmlString1 = "<button type=\"button\" class='btn btn-default myButtons' onclick=\"suggested();Api.sendRequest('";
      //     var htmlString2 = "', null);\">";
      //     var htmlString3 = "</button>";
      //     var htmlString = "";
      //     for (var i=0;i<buttons.length;i++){
      //       htmlString = htmlString.concat(htmlString1+onclicklist[i]+htmlString2+buttons[i]+htmlString3);
      //     }
      //     messageArray.push(Common.buildDomElement(extraOutput(htmlString)));

      //   }
      // }

    });
    return messageArray;
  }

  // Scroll to the bottom of the chat window (to the most recent messages)
  function scrollToChatBottom() {
    var scrollingChat = document.querySelector('#scrollingChat');
    scrollingChat.scrollTop = scrollingChat.scrollHeight;
  }

  var questionID = 1;  

  // Handles the submission of input
  function inputKeyDown(event, inputBox) {
    // Submit on enter key, dis-allowing blank messages
    if (event.keyCode === 13 && inputBox.value) {
      // Retrieve the context from the previous server response
      var context;
      var latestResponse = Api.getResponsePayload();
      if (latestResponse) {
        context = latestResponse.context;
      }

      // Send the user message
      Api.sendRequest(inputBox.value, context);

      // Clear input box for further messages
      inputBox.value = '';
      Common.fireEvent(inputBox, 'input');

      //Get the questionID
      var localQuestionID = localStorage.getItem("questionID");
      //Get the sessionID
      var localSessionID = localStorage.getItem("sessionID") - 1;
      //Concat the template
      var suggestedTemplate = localSessionID + "_" + localQuestionID + "_suggested";
      //Store it in local storage
      localStorage.setItem(suggestedTemplate, "Not suggested");
    }
  }
}());
