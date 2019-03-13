import { Rooms, Subscriptions, Messages } from '/app/models';
import { Meteor } from 'meteor/meteor';
import { callbacks } from '/app/callbacks';

export const addUserToRoom = function(rid, user, inviter, silenced) {
	const now = new Date();
	const room = Rooms.findOneById(rid);

	// Check if user is already in room
	const subscription = Subscriptions.findOneByRoomIdAndUserId(rid, user._id);
	if (subscription) {
		return;
	}

	if (room.t === 'c' || room.t === 'p') {
		// Add a new event, with an optional inviter
		callbacks.run('beforeAddedToRoom', { user, inviter }, room);

		// Keep the current event
		callbacks.run('beforeJoinRoom', user, room);
	}

	Subscriptions.createWithRoomAndUser(room, user, {
		ts: now,
		open: true,
		alert: true,
		unread: 1,
		userMentions: 1,
		groupMentions: 0,
	});

	if (!silenced) {
		if (inviter) {
			Messages.createUserAddedWithRoomIdAndUser(rid, user, {
				ts: now,
				u: {
					_id: inviter._id,
					username: inviter.username,
				},
			});
		} else if (room.prid) {
			Messages.createUserJoinWithRoomIdAndUserThread(rid, user, { ts: now });
		} else {
			Messages.createUserJoinWithRoomIdAndUser(rid, user, { ts: now });
		}
	}

	if (room.t === 'c' || room.t === 'p') {
		Meteor.defer(function() {
			// Add a new event, with an optional inviter
			callbacks.run('afterAddedToRoom', { user, inviter }, room);

			// Keep the current event
			callbacks.run('afterJoinRoom', user, room);
		});
	}

	return true;
};