import { get } from 'lodash';
import fetch from 'node-fetch';

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";


const VERIFY_TOKEN = 'chatbot000111';
const TableName = "demo_poc_nuviadi_facebook_page_id";

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

const dynamoScanID = async (page_id) => {
    try {
        const command = new GetCommand({
            TableName: TABLE_NAME_USER_PROFILE,
            Key: {
                PageID: page_id,
            },
        });
        const userDetail = await dynamo.send(command);
        return userDetail.Item.pageToken
    } catch (err) {
        return { status: false, desc: `error when get data => ${err}` }
    }

}

const handleEvents = async (events, accessToken) => {
    const text = get(events, ['messaging', 0, 'message', 'text']);
    const sender = get(events, ['messaging', 0, 'sender', 'id']);
    if (!sender || !text) return;

    let messagePayload;

    if (text.toLowerCase() === 'yes') {
        messagePayload = {
            messaging_type: "RESPONSE",
            recipient: { id: sender },
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "generic",
                        elements: [
                            {
                                title: "คุณต้องการเริ่มต้นใช้งานไหม?",
                                subtitle: "โปรดเลือกตัวเลือกของคุณ",
                                buttons: [
                                    { type: "postback", title: "True", payload: "USER_SELECTED_TRUE" },
                                    { type: "postback", title: "False", payload: "USER_SELECTED_FALSE" }
                                ]
                            }
                        ]
                    }
                }
            }
        };
    } else {
        messagePayload = {
            messaging_type: "RESPONSE",
            recipient: { id: sender },
            message: { text }
        };
    }

    await fetch("https://graph.facebook.com/v6.0/me/messages", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload),
        qs: {
            access_token: accessToken
        }
    }).then(res => res.json())
        .then(result => {
            console.log("Facebook send message result:", result);
        }).catch(err => {
            console.error("Error sending message:", err);
        });
};

export const handler = async (event) => {
    const method = event.httpMethod;
    if (method === 'GET') {
        const params = event.queryStringParameters || {};
        const mode = params['hub.mode'];
        const token = params['hub.verify_token'];
        const challenge = params['hub.challenge'];

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            return {
                statusCode: 200,
                body: challenge
            };
        } else {
            return {
                statusCode: 403,
                body: 'Verification failed'
            };
        }
    }

    if (method === 'POST') {
        const body = JSON.parse(event.body);
        console.log("Webhook event:", JSON.stringify(body, null, 2));
        console.log(body.entry)
        if (body.object === 'page') {
            const entry = body.entry[0];
            const accessToken = await dynamoScanID(entry.id)
            await handleEvents(entry, accessToken);
        }

        return {
            statusCode: 200,
            body: 'EVENT_RECEIVED'
        };
    }

    return {
        statusCode: 404,
        body: 'Not Found'
    };
};
