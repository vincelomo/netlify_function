const got = require('got')

exports.handler = async function(event, context) {
    console.log(`received ${event.httpMethod} request`);

    // Your verify token. Should be a random string.
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

    if(event.httpMethod === "GET"){
        // Parse the query params
        let mode = event.queryStringParameters['hub.mode'];
        let token = event.queryStringParameters['hub.verify_token'];
        let challenge = event.queryStringParameters['hub.challenge'];

        // Checks if a token and mode is in the query string of the request
        if (mode && token) {

            // Checks the mode and token sent is correct
            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                // Responds with the challenge token from the request
                console.log('WEBHOOK_VERIFIED');
                return {
                    statusCode: 200,
                    body: challenge
                };
            } else {
                // Responds with '403 Forbidden' if verify tokens do not match
                return {
                    statusCode: 403
                };
            }
            
        }

        return {
            statusCode: 200,
            body: 'faceboot bot test'
        };
    }
    

    if(event.httpMethod === "POST"){
        let body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        console.log(`received POST body: ${body}`)
        // Checks if this is an event from a page subscription
        if (body.object === 'page') {

            // Iterates over each entry - there may be multiple if batched
            body.entry.forEach(function(entry) {

                // Gets the body of the webhook event
                let webhookEvent = entry.messaging[0];
                console.log(webhookEvent);

                // Get the sender PSID
                let senderPsid = webhookEvent.sender.id;
                console.log('Sender PSID: ' + senderPsid);

                // Check if the event is a message or postback and
                // pass the event to the appropriate handler function
                if (webhookEvent.message) {
                    await handleMessage(senderPsid, webhookEvent.message);
                } else if (webhookEvent.postback) {
                    await handlePostback(senderPsid, webhookEvent.postback);
                }
            });

            // Returns a '200 OK' response to all requests
            return {
                statusCode: 200,
                body: 'EVENT_RECEIVED'
            };
        } else {

            // Returns a '404 Not Found' if event is not from a page subscription
            return {
                statusCode: 404
            };
        }
    }
}

// Handles messages events
function handleMessage(senderPsid, receivedMessage) {
    let response;
  
    // Checks if the message contains text
    if (receivedMessage.text) {
        // Create the payload for a basic text message, which
        // will be added to the body of your request to the Send API
        response = {
            'text': `You sent the message: '${receivedMessage.text}'. Now send me an attachment!`
        };
    } else if (receivedMessage.attachments) {
  
        // Get the URL of the message attachment
        let attachmentUrl = receivedMessage.attachments[0].payload.url;
        response = {
            'attachment': {
            'type': 'template',
            'payload': {
                'template_type': 'generic',
                'elements': [{
                'title': 'Is this the right picture?',
                'subtitle': 'Tap a button to answer.',
                'image_url': attachmentUrl,
                'buttons': [
                    {
                    'type': 'postback',
                    'title': 'Yes!',
                    'payload': 'yes',
                    },
                    {
                    'type': 'postback',
                    'title': 'No!',
                    'payload': 'no',
                    }
                ],
                }]
            }
            }
        };
    }
  
    // Send the response message
    return callSendAPI(senderPsid, response);
}
  
// Handles messaging_postbacks events
function handlePostback(senderPsid, receivedPostback) {
    let response;
  
    // Get the payload for the postback
    let payload = receivedPostback.payload;
  
    // Set the response based on the postback payload
    if (payload === 'yes') {
        response = { 'text': 'Thanks!' };
    } else if (payload === 'no') {
        response = { 'text': 'Oops, try sending another image.' };
    }

    // Send the message to acknowledge the postback
    return callSendAPI(senderPsid, response);
}
  
// Sends response messages via the Send API
function callSendAPI(senderPsid, response) {
    console.log('sending FB Messenger response...')

    // The page access token we have generated in your app settings
    const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
  
    // Construct the message body
    let requestBody = {
        'messaging_type': 'RESPONSE',
        'recipient': {
            'id': senderPsid
        },
        'message': response
    };

    return got.post(
        `https://graph.facebook.com/v11.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        {
            json: requestBody
        }
    ).then(() => {
        console.log('Message sent!');
    }).catch(err => {
        console.log('Unable to send message:' + err);
    })
}