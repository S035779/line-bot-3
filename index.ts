import { ClientConfig, Client, middleware, MiddlewareConfig, WebhookEvent, TextMessage, MessageAPIResponseBase, QuickReplyItem } from "@line/bot-sdk";
import express, { Application, Request, Response } from "express";

const clientConfig: ClientConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET,
}

const middlewareConfig: MiddlewareConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

const PORT = process.env.PORT || 3000;

const client = new Client(clientConfig);

const app: Application = express();

const textEventHandler = async (event: WebhookEvent ): Promise<MessageAPIResponseBase | undefined> => {
  if (event.type === "follow") {
    const { displayName } = await client.getProfile(event.source.userId!);

    const response: TextMessage = {
      type: "text",
      text: `${displayName}さん、はじめまして！`,
    };
    await client.replyMessage(event.replyToken, response);
  }

  if (event.type === "message" && event.message.type === "text") {
    const { text } = event.message;

    if (text === "こんにちは") {
      const response: TextMessage = {
        type: "text",
        text: "これはこれは",
      };
      await client.replyMessage(event.replyToken, response);
    }

    if (text === "クイズ") {
      const { text } = event.message;
      const quickReplys: QuickReplyItem[] = [
        {
          type: "action",
          action: {
            type: "postback",
            label: "yes",
            data: '{"action":"yes"}',
          },
        },
        {
          type: "action",
          action: {
            type: "postback",
            label: "no",
            data: '{"action":"no"}',
          },
        },
      ];

      const response: TextMessage = {
        type: "text",
        text: `${text}を始めますか？`,
        quickReply: {
          items: quickReplys,
        }
      };
      await client.replyMessage(event.replyToken, response);
    }
  }

  if (event.type === "postback") {
    const { data } = event.postback;
    console.log(JSON.parse(data));
  }

  return;
};

const pushMessage = async (userId: string) => {
  const message: TextMessage = {
    type: "text",
    text: "プッシュ・メッセージです．"
  }
  await client.pushMessage(userId, message);
};

const broadcastMessage = async () => {
  const message: TextMessage = {
    type: "text",
    text: "ブロードキャスト・メッセージです．"
  }
  await client.broadcast(message);
}

app.get("/", async (_: Request, res: Response): Promise<Response> => {

  return  res.status(200).json({
    status: "success",
    message: "Connected successfully",
  })
});

app.get("/broadcast", async (_: Request, res: Response): Promise<Response> => {

  try {
    await broadcastMessage();
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(err);
    }

    return res.status(500).json({
      status: "error",
    });
  }

  return res.status(200).json({
    status: "success",
    message: "Broadcast message is successfully",
  })
});

app.get("/message/:id", async (req: Request, res: Response): Promise<Response> => {
  console.dir(req.params, { depth: 10, colors: true });

  try {
    await pushMessage(req.params.id);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(err);
    }

    return res.status(500).json({
      status: "error",
    });
  }

  return res.status(200).json({
    status: "success",
    message: `Push message for ID:${req.params.id} completed successfully`,
  })
});

app.post("/bot/webhook", middleware(middlewareConfig), async (req: Request, res: Response): Promise<Response> => {
  console.dir(req.body, { depth: 10, colors: true });

  const events: WebhookEvent[] = req.body.events;
  const results = await Promise.all(
    events.map(
      async (event: WebhookEvent) => {
        try {
          await textEventHandler(event);
        } catch (err: unknown) {
          if (err instanceof Error) {
            console.error(err);
          }

          return res.status(500).json({
            status: "error",
          });
        }
      }
    )
  );

  return res.status(200).json({
    status: "success",
    results,
  })
});

app.listen(PORT, () => {
  console.log(`Application is live and listening on port ${PORT}`);
});
