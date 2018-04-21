import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Participant, Group, Event } from '../models';
import pubsub from '../pubsub';
import { PARTICIPANT_JOINED } from './subscription';
import { mustBeAuthenticated } from './security';

export const Mutation = {
    addGroup: async (root, group, ctx) => {
        mustBeAuthenticated(ctx, ctx.user);
        if (!ctx.user.events || ctx.user.events.length === 0 || !(ctx.user.events.indexOf(group.event) > -1)) {
            throw new Error('Unauthorized');
        }
        return Group.add(group, ctx.user.id);
    },

    addEvent: async (root, event, ctx) => {
        mustBeAuthenticated(ctx, ctx.user);
        const newEvent = await Event.add(event, ctx.user.id);
        ctx.user = await User.addEvent(ctx.user.id, newEvent.id);
        return newEvent;
    },

    signup: async (root, { username, password }, ctx) => {
        const hash = await bcrypt.hash(password, 12);
        const user = await User.add({ username, password: hash });

        user.jwt = jwt.sign(
            {
                type: 'user',
                id: user.id,
                version: 1
            },
            ctx.secret,
            { expiresIn: '1w' }
        );

        ctx.user = user;

        return user;
    },

    login: async (root, { username, password }, ctx) => {
        const user = await User.findByUsername(username);
        if (!user) {
            throw new Error('Invalid username or password');
        }
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            throw new Error('Invalid username or password');
        }

        user.jwt = jwt.sign(
            {
                type: 'user',
                id: user.id,
                version: user.version
            },
            ctx.secret,
            { expiresIn: '1w' }
        );

        ctx.user = user;

        return user;
    },

    join: async (root, { username, secret }, ctx) => {
        const participant = await Participant.add(username, secret);

        participant.jwt = jwt.sign(
            {
                type: 'participant',
                id: participant.id,
                version: participant.version
            },
            ctx.secret,
            { expiresIn: '1w' }
        );

        ctx.participant = participant;

        pubsub.publish(PARTICIPANT_JOINED, { [PARTICIPANT_JOINED]: participant });

        return participant;
    },

    move: async (root, { latitude, longitude }, ctx) => {
        mustBeAuthenticated(ctx, ctx.participant);
        return Participant.move(ctx.participant.id, latitude, longitude);
    }
};
