import {
  ActionType,
  ActionSource,
  ActionFromInstallation,
} from '../proto/v0/action';
import { submitProto } from '../tracking';
import { Installation } from '../models';
import { Request, Response } from 'express';
import statsd from '../config/statsd';

/**
 * Handle the install webhook from Jira
 */
export default async (req: Request, res: Response): Promise<void> => {
  req.log.info('Received installation payload');

  const { baseUrl: host, clientKey, sharedSecret } = req.body;
  const installation =
    Installation &&
    (await Installation.install({
      host,
      clientKey,
      sharedSecret,
    }));

  const action = await ActionFromInstallation(installation);
  action.type = ActionType.CREATED;
  action.actionSource = ActionSource.WEBHOOK;

  statsd.increment('install.request');

  res.sendStatus(204);
  await submitProto(action);
};
