
const express = require('express')
const bodyParser = require('body-parser')
const { get } = require('lodash')
const request = require('request')
const app = express()


const VERIFY_TOKEN = 'chatbot000111'
const PAGE_ACCESS_TOKEN = [
    "",
    ""
]

app.set('port', (3002))

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())


const handleEvents = (events, page_id) => {
    const text = get(events, ['messaging', 0, 'message', 'text']);
    const sender = get(events, ['messaging', 0, 'sender', 'id']);
    console.log(page_id)
    if (!sender || !text) {
        return;
    }

    if (text.toLowerCase() === 'yes') {
        // ถ้า user พิมพ์ "yes" ส่งเป็น Card มีปุ่ม True / False
        const requestBody = {
            "messaging_type": "RESPONSE",
            "recipient": { id: sender },
            "message": {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements": [
                            {
                                "title": "คุณต้องการเริ่มต้นใช้งานไหม?",
                                "subtitle": "โปรดเลือกตัวเลือกของคุณ",
                                "buttons": [
                                    {
                                        "type": "postback",
                                        "title": "True",
                                        "payload": "USER_SELECTED_TRUE"
                                    },
                                    {
                                        "type": "postback",
                                        "title": "False",
                                        "payload": "USER_SELECTED_FALSE"
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        };

        const config = {
            method: 'post',
            uri: "https://graph.facebook.com/v6.0/me/messages",
            json: requestBody,
            qs: {
                access_token: `${PAGE_ACCESS_TOKEN}`,
            },
        };

        request(config, (err, res, body) => {
            if (!body.error) {
                console.log('Card with buttons sent!', body);
            } else {
                console.error("Unable to send card:", body.error);
            }
        });

    } else {
        const requestBody = {
            "messaging_type": "RESPONSE",
            "recipient": { id: sender },
            "message": { text }
        };
        access_token_test = page_id === "642155692311378" ? PAGE_ACCESS_TOKEN[0] : PAGE_ACCESS_TOKEN[1]
        const config = {
            method: 'post',
            uri: "https://graph.facebook.com/v6.0/me/messages",
            json: requestBody,
            qs: {
                access_token: `${access_token_test}`,
            },
        };

        request(config, (err, res, body) => {
            if (!body.error) {
                console.log('message sent!', body);
            } else {
                console.error("Unable to send message:", body.error);
            }
        });
    }
}

app.get("/webhook", async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified!');
        res.status(200).send(challenge);
    } else {
        console.log('Webhook verification failed!');
        res.sendStatus(403);
    }
})

app.post('/webhook', async (req, res) => {
    const { body } = req;
    console.log("body => ", body)
    console.log("body[0] => ", body.entry[0].id)
    if (body.object === 'page') {
        const events = body && body.entry && body.entry[0]
        await handleEvents(events, body.entry[0].id)
    } else {
        res.sendStatus(404);
    }
    return res.sendStatus(200)
})


app.listen(app.get('port'), function () {
    console.log("service listen at http://localhost:3002")
})

