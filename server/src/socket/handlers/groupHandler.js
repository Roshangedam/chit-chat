/**
 * Group Event Handlers
 * Handles group-related socket events
 */

const groupQueries = require('../../db/groupQueries');
const { getUserSockets, isUserOnline } = require('../onlineUsers');

/**
 * Register group handlers on socket connection
 */
function registerGroupHandlers(socket, io) {
    const clientIP = socket.clientIP;

    // ============================================================
    // GROUP CRUD OPERATIONS
    // ============================================================

    /**
     * Create a new group
     * @event group:create
     * @param {Object} data - { name, description?, avatar?, type?, memberIds? }
     */
    socket.on('group:create', (data, callback) => {
        try {
            const { name, description, avatar, type = 'group', memberIds = [] } = data;

            if (!name || name.trim().length === 0) {
                return callback?.({ success: false, error: 'Group name is required' });
            }

            // Create the group
            const group = groupQueries.createGroup(name.trim(), clientIP, description, avatar, type);

            if (!group) {
                return callback?.({ success: false, error: 'Failed to create group' });
            }

            // Add initial members (if any)
            const addedMembers = [];
            for (const memberId of memberIds) {
                if (memberId !== clientIP) { // Don't add creator again
                    const added = groupQueries.addMember(group.id, memberId, clientIP, 'member');
                    if (added) {
                        addedMembers.push(memberId);
                    }
                }
            }

            // Join the socket room for this group
            socket.join(`group:${group.id}`);

            // Notify added members about the new group
            addedMembers.forEach(memberId => {
                if (isUserOnline(memberId)) {
                    const memberSockets = getUserSockets(memberId);
                    memberSockets.forEach(socketId => {
                        io.to(socketId).emit('group:added', {
                            group: group,
                            addedBy: clientIP
                        });
                        // Join them to the room
                        const memberSocket = io.sockets.sockets.get(socketId);
                        if (memberSocket) {
                            memberSocket.join(`group:${group.id}`);
                        }
                    });
                }
            });

            console.log(`👥 Group created: "${name}" by ${clientIP} with ${addedMembers.length + 1} members`);

            callback?.({ success: true, group });

        } catch (error) {
            console.error('❌ Error creating group:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Get user's groups list
     * @event group:getList
     */
    socket.on('group:getList', (callback) => {
        try {
            const groups = groupQueries.getUserGroups(clientIP);

            // Join socket rooms for all groups
            console.log(`👥 [${clientIP}] Joining ${groups.length} group rooms...`);
            groups.forEach(group => {
                socket.join(`group:${group.id}`);
                console.log(`   → Joined room: group:${group.id} (${group.name})`);
            });

            callback?.({ success: true, groups });

        } catch (error) {
            console.error('❌ Error getting groups:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Get group details
     * @event group:getDetails
     * @param {Object} data - { groupId }
     */
    socket.on('group:getDetails', (data, callback) => {
        try {
            const { groupId } = data;

            // Check if user is member
            if (!groupQueries.isMember(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Not a member of this group' });
            }

            const group = groupQueries.getGroupById(groupId);
            const members = groupQueries.getGroupMembers(groupId);
            const settings = groupQueries.getGroupSettings(groupId);

            callback?.({
                success: true,
                group,
                members,
                settings,
                myRole: groupQueries.getMember(groupId, clientIP)?.role
            });

        } catch (error) {
            console.error('❌ Error getting group details:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Update group info
     * @event group:update
     * @param {Object} data - { groupId, name?, description?, avatar? }
     */
    socket.on('group:update', (data, callback) => {
        try {
            const { groupId, ...updates } = data;

            // Check permissions
            const settings = groupQueries.getGroupSettings(groupId);
            const isAdmin = groupQueries.isAdmin(groupId, clientIP);

            if (settings.who_can_edit_info === 'admins' && !isAdmin) {
                return callback?.({ success: false, error: 'Only admins can edit group info' });
            }

            const group = groupQueries.updateGroup(groupId, updates);

            if (!group) {
                return callback?.({ success: false, error: 'Failed to update group' });
            }

            // Notify all group members
            io.to(`group:${groupId}`).emit('group:updated', {
                groupId,
                updates,
                updatedBy: clientIP
            });

            console.log(`📝 Group updated: ${groupId} by ${clientIP}`);

            callback?.({ success: true, group });

        } catch (error) {
            console.error('❌ Error updating group:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Delete group (creator only)
     * @event group:delete
     * @param {Object} data - { groupId }
     */
    socket.on('group:delete', (data, callback) => {
        try {
            const { groupId } = data;

            // Only creator can delete
            if (!groupQueries.isCreator(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Only the group creator can delete the group' });
            }

            // Get members before deleting
            const members = groupQueries.getGroupMembers(groupId);
            const group = groupQueries.getGroupById(groupId);

            // Delete the group
            groupQueries.deleteGroup(groupId);

            // Notify all members
            members.forEach(member => {
                if (isUserOnline(member.user_id)) {
                    const memberSockets = getUserSockets(member.user_id);
                    memberSockets.forEach(socketId => {
                        io.to(socketId).emit('group:deleted', {
                            groupId,
                            groupName: group.name,
                            deletedBy: clientIP
                        });
                        // Leave the room
                        const memberSocket = io.sockets.sockets.get(socketId);
                        if (memberSocket) {
                            memberSocket.leave(`group:${groupId}`);
                        }
                    });
                }
            });

            console.log(`🗑️ Group deleted: ${group.name} by ${clientIP}`);

            callback?.({ success: true });

        } catch (error) {
            console.error('❌ Error deleting group:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Regenerate invite link
     * @event group:regenerateLink
     * @param {Object} data - { groupId }
     */
    socket.on('group:regenerateLink', (data, callback) => {
        try {
            const { groupId } = data;

            // Only admins can regenerate link
            if (!groupQueries.isAdmin(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Only admins can regenerate invite link' });
            }

            const newLink = groupQueries.regenerateInviteLink(groupId);

            console.log(`🔗 Invite link regenerated for group ${groupId}`);

            callback?.({ success: true, inviteLink: newLink });

        } catch (error) {
            console.error('❌ Error regenerating link:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Join group via invite link
     * @event group:join
     * @param {Object} data - { inviteLink }
     */
    socket.on('group:join', (data, callback) => {
        try {
            const { inviteLink } = data;

            const group = groupQueries.getGroupByInviteLink(inviteLink);

            if (!group) {
                return callback?.({ success: false, error: 'Invalid invite link' });
            }

            // Check if already a member
            if (groupQueries.isMember(group.id, clientIP)) {
                return callback?.({ success: false, error: 'You are already a member of this group' });
            }

            // Check if approval required
            const settings = groupQueries.getGroupSettings(group.id);
            if (settings.require_approval) {
                // TODO: Implement join request system
                return callback?.({ success: false, error: 'This group requires admin approval to join' });
            }

            // Add member
            groupQueries.addMember(group.id, clientIP, clientIP, 'member');

            // Join socket room
            socket.join(`group:${group.id}`);

            // Notify group members
            io.to(`group:${group.id}`).emit('group:memberJoined', {
                groupId: group.id,
                member: {
                    user_id: clientIP,
                    role: 'member',
                    joined_at: new Date().toISOString()
                }
            });

            // Get full group details for the new member
            const fullGroup = groupQueries.getGroupById(group.id);

            console.log(`➕ ${clientIP} joined group "${group.name}" via invite link`);

            callback?.({ success: true, group: fullGroup });

        } catch (error) {
            console.error('❌ Error joining group:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    // ============================================================
    // MEMBER MANAGEMENT
    // ============================================================

    /**
     * Add member to group
     * @event group:addMember
     * @param {Object} data - { groupId, userId }
     */
    socket.on('group:addMember', (data, callback) => {
        try {
            const { groupId, userId } = data;

            // Check permissions
            const settings = groupQueries.getGroupSettings(groupId);
            const isAdmin = groupQueries.isAdmin(groupId, clientIP);

            if (settings.who_can_add_members === 'admins' && !isAdmin) {
                return callback?.({ success: false, error: 'Only admins can add members' });
            }

            // Check if user is a member
            if (!groupQueries.isMember(groupId, clientIP)) {
                return callback?.({ success: false, error: 'You are not a member of this group' });
            }

            // Check if target already a member
            if (groupQueries.isMember(groupId, userId)) {
                return callback?.({ success: false, error: 'User is already a member' });
            }

            // Add member
            const added = groupQueries.addMember(groupId, userId, clientIP, 'member');

            if (!added) {
                return callback?.({ success: false, error: 'Failed to add member' });
            }

            const member = groupQueries.getMember(groupId, userId);
            const group = groupQueries.getGroupById(groupId);

            // Notify the added user
            if (isUserOnline(userId)) {
                const userSockets = getUserSockets(userId);
                userSockets.forEach(socketId => {
                    io.to(socketId).emit('group:added', {
                        group,
                        addedBy: clientIP
                    });
                    // Join the room
                    const userSocket = io.sockets.sockets.get(socketId);
                    if (userSocket) {
                        userSocket.join(`group:${groupId}`);
                    }
                });
            }

            // Notify all group members
            io.to(`group:${groupId}`).emit('group:memberAdded', {
                groupId,
                member,
                addedBy: clientIP
            });

            console.log(`➕ ${userId} added to group by ${clientIP}`);

            callback?.({ success: true, member });

        } catch (error) {
            console.error('❌ Error adding member:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Remove member from group
     * @event group:removeMember
     * @param {Object} data - { groupId, userId }
     */
    socket.on('group:removeMember', (data, callback) => {
        try {
            const { groupId, userId } = data;

            // Can't remove creator
            if (groupQueries.isCreator(groupId, userId)) {
                return callback?.({ success: false, error: 'Cannot remove the group creator' });
            }

            // Check permissions - only admins can remove others
            const isAdmin = groupQueries.isAdmin(groupId, clientIP);
            if (userId !== clientIP && !isAdmin) {
                return callback?.({ success: false, error: 'Only admins can remove members' });
            }

            // If removing an admin, must be creator
            if (groupQueries.isAdmin(groupId, userId) && !groupQueries.isCreator(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Only the creator can remove admins' });
            }

            const removed = groupQueries.removeMember(groupId, userId);

            if (!removed) {
                return callback?.({ success: false, error: 'Failed to remove member' });
            }

            // Notify the removed user
            if (isUserOnline(userId)) {
                const userSockets = getUserSockets(userId);
                userSockets.forEach(socketId => {
                    io.to(socketId).emit('group:removed', {
                        groupId,
                        removedBy: clientIP
                    });
                    // Leave the room
                    const userSocket = io.sockets.sockets.get(socketId);
                    if (userSocket) {
                        userSocket.leave(`group:${groupId}`);
                    }
                });
            }

            // Notify all group members
            io.to(`group:${groupId}`).emit('group:memberRemoved', {
                groupId,
                userId,
                removedBy: clientIP
            });

            console.log(`➖ ${userId} removed from group by ${clientIP}`);

            callback?.({ success: true });

        } catch (error) {
            console.error('❌ Error removing member:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Leave group
     * @event group:leave
     * @param {Object} data - { groupId }
     */
    socket.on('group:leave', (data, callback) => {
        try {
            const { groupId } = data;

            // Creator can't leave (must delete or transfer ownership)
            if (groupQueries.isCreator(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Group creator cannot leave. Delete the group or transfer ownership.' });
            }

            const removed = groupQueries.removeMember(groupId, clientIP);

            if (!removed) {
                return callback?.({ success: false, error: 'Failed to leave group' });
            }

            // Leave socket room
            socket.leave(`group:${groupId}`);

            // Notify group members
            io.to(`group:${groupId}`).emit('group:memberLeft', {
                groupId,
                userId: clientIP
            });

            console.log(`🚪 ${clientIP} left group ${groupId}`);

            callback?.({ success: true });

        } catch (error) {
            console.error('❌ Error leaving group:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Update member role
     * @event group:updateRole
     * @param {Object} data - { groupId, userId, role }
     */
    socket.on('group:updateRole', (data, callback) => {
        try {
            const { groupId, userId, role } = data;

            // Validate role
            if (!['admin', 'member'].includes(role)) {
                return callback?.({ success: false, error: 'Invalid role' });
            }

            // Can't change creator's role
            if (groupQueries.isCreator(groupId, userId)) {
                return callback?.({ success: false, error: 'Cannot change creator role' });
            }

            // Only creator can make/remove admins
            if (!groupQueries.isCreator(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Only the creator can change roles' });
            }

            const oldMember = groupQueries.getMember(groupId, userId);
            const updated = groupQueries.updateMemberRole(groupId, userId, role);

            if (!updated) {
                return callback?.({ success: false, error: 'Failed to update role' });
            }

            // Log the change
            groupQueries.logPermissionChange(groupId, userId, 'role_change', oldMember.role, role, clientIP);

            // Notify the user
            if (isUserOnline(userId)) {
                const userSockets = getUserSockets(userId);
                userSockets.forEach(socketId => {
                    io.to(socketId).emit('group:roleChanged', {
                        groupId,
                        newRole: role
                    });
                });
            }

            // Notify all group members
            io.to(`group:${groupId}`).emit('group:memberRoleChanged', {
                groupId,
                userId,
                newRole: role,
                changedBy: clientIP
            });

            console.log(`👑 ${userId} role changed to ${role} by ${clientIP}`);

            callback?.({ success: true });

        } catch (error) {
            console.error('❌ Error updating role:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    // ============================================================
    // GROUP SETTINGS
    // ============================================================

    /**
     * Update group settings
     * @event group:updateSettings
     * @param {Object} data - { groupId, settings }
     */
    socket.on('group:updateSettings', (data, callback) => {
        try {
            const { groupId, settings } = data;

            // Only admins can change settings
            if (!groupQueries.isAdmin(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Only admins can change settings' });
            }

            const updatedSettings = groupQueries.updateGroupSettings(groupId, settings);

            if (!updatedSettings) {
                return callback?.({ success: false, error: 'Failed to update settings' });
            }

            // Notify all group members
            io.to(`group:${groupId}`).emit('group:settingsUpdated', {
                groupId,
                settings: updatedSettings,
                updatedBy: clientIP
            });

            console.log(`⚙️ Group settings updated for ${groupId} by ${clientIP}`);

            callback?.({ success: true, settings: updatedSettings });

        } catch (error) {
            console.error('❌ Error updating settings:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    // ============================================================
    // MEMBER MUTING
    // ============================================================

    /**
     * Mute a member
     * @event group:muteMember
     * @param {Object} data - { groupId, userId, duration, reason? }
     */
    socket.on('group:muteMember', (data, callback) => {
        try {
            const { groupId, userId, duration, reason } = data;

            // Only admins can mute
            if (!groupQueries.isAdmin(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Only admins can mute members' });
            }

            // Can't mute admins (unless you're creator)
            if (groupQueries.isAdmin(groupId, userId) && !groupQueries.isCreator(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Only creator can mute admins' });
            }

            // Can't mute creator
            if (groupQueries.isCreator(groupId, userId)) {
                return callback?.({ success: false, error: 'Cannot mute the group creator' });
            }

            // Validate duration
            if (!['1h', '1d', '1w', 'forever'].includes(duration)) {
                return callback?.({ success: false, error: 'Invalid mute duration' });
            }

            const permissions = groupQueries.muteMember(groupId, userId, duration, reason, clientIP);

            // Notify the muted user
            if (isUserOnline(userId)) {
                const userSockets = getUserSockets(userId);
                userSockets.forEach(socketId => {
                    io.to(socketId).emit('group:muted', {
                        groupId,
                        duration,
                        reason,
                        mutedBy: clientIP,
                        mutedUntil: permissions.muted_until
                    });
                });
            }

            // Notify all group members
            io.to(`group:${groupId}`).emit('group:memberMuted', {
                groupId,
                userId,
                duration,
                mutedBy: clientIP
            });

            console.log(`🔇 ${userId} muted in group for ${duration} by ${clientIP}`);

            callback?.({ success: true, permissions });

        } catch (error) {
            console.error('❌ Error muting member:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Unmute a member
     * @event group:unmuteMember
     * @param {Object} data - { groupId, userId }
     */
    socket.on('group:unmuteMember', (data, callback) => {
        try {
            const { groupId, userId } = data;

            // Only admins can unmute
            if (!groupQueries.isAdmin(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Only admins can unmute members' });
            }

            const permissions = groupQueries.unmuteMember(groupId, userId, clientIP);

            // Notify the unmuted user
            if (isUserOnline(userId)) {
                const userSockets = getUserSockets(userId);
                userSockets.forEach(socketId => {
                    io.to(socketId).emit('group:unmuted', {
                        groupId,
                        unmutedBy: clientIP
                    });
                });
            }

            // Notify all group members
            io.to(`group:${groupId}`).emit('group:memberUnmuted', {
                groupId,
                userId,
                unmutedBy: clientIP
            });

            console.log(`🔊 ${userId} unmuted in group by ${clientIP}`);

            callback?.({ success: true, permissions });

        } catch (error) {
            console.error('❌ Error unmuting member:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Get mute history
     * @event group:getMuteHistory
     * @param {Object} data - { groupId, userId? }
     */
    socket.on('group:getMuteHistory', (data, callback) => {
        try {
            const { groupId, userId } = data;

            // Only admins can see full mute history
            if (!groupQueries.isAdmin(groupId, clientIP) && userId !== clientIP) {
                return callback?.({ success: false, error: 'Access denied' });
            }

            const history = groupQueries.getMuteHistory(groupId, userId);

            callback?.({ success: true, history });

        } catch (error) {
            console.error('❌ Error getting mute history:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    // ============================================================
    // GROUP MESSAGING
    // ============================================================

    const messageQueries = require('../../db/messageQueries');
    const pushService = require('../../services/pushService');

    /**
     * Send a group message
     * @event group:message:send
     * @param {Object} data - { groupId, content, type?, replyTo?, isForwarded?, caption?, fileName?, fileSize? }
     */
    socket.on('group:message:send', (data, callback) => {
        try {
            const { groupId, content, type = 'text', replyTo, isForwarded, caption, fileName, fileSize } = data;

            // Check if member
            if (!groupQueries.isMember(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Not a member of this group' });
            }

            // Check if can send
            if (!groupQueries.canSendMessage(groupId, clientIP)) {
                const perms = groupQueries.getMemberPermissions(groupId, clientIP);
                if (perms?.is_muted) {
                    return callback?.({ success: false, error: 'You are muted in this group' });
                }
                return callback?.({ success: false, error: 'You cannot send messages in this group' });
            }

            // Check if can send media
            if (type !== 'text' && !groupQueries.canSendMedia(groupId, clientIP)) {
                return callback?.({ success: false, error: 'You cannot send media in this group' });
            }

            // Check if group is locked
            const settings = groupQueries.getGroupSettings(groupId);
            if (settings.is_locked && !groupQueries.isAdmin(groupId, clientIP)) {
                return callback?.({ success: false, error: 'This group is locked. Only admins can send messages.' });
            }

            // Save message
            const message = messageQueries.saveGroupMessage(
                clientIP, groupId, content, type, replyTo, isForwarded, caption, fileName, fileSize
            );

            // Get sender info
            const { findUserByIP } = require('../../db/userQueries');
            const sender = findUserByIP(clientIP);

            // Attach sender info to message
            // Priority: custom_name > hostname (if different from IP) > name > IP
            const senderName = sender?.custom_name
                || (sender?.name && sender.name !== clientIP ? sender.name : null)
                || (sender?.hostname && sender.hostname !== clientIP ? sender.hostname : null)
                || clientIP;
            message.sender_name = senderName;
            message.sender_custom_name = sender?.custom_name;
            message.sender_avatar = sender?.avatar;

            // Check room before broadcasting
            const room = io.sockets.adapter.rooms.get(`group:${groupId}`);
            console.log(`📤 Broadcasting message to group:${groupId}`);
            console.log(`   Room members: ${room ? room.size : 0}, Sender: ${senderName}`);

            // Broadcast to all group members
            io.to(`group:${groupId}`).emit('group:message:new', {
                groupId,
                message
            });

            // Send push notifications to offline members
            const members = groupQueries.getGroupMembers(groupId);
            const group = groupQueries.getGroupById(groupId);

            members.forEach(member => {
                if (member.user_id !== clientIP && !isUserOnline(member.user_id)) {
                    const contentPreview = type === 'text'
                        ? (content.length > 50 ? content.substring(0, 50) + '...' : content)
                        : `[${type}]`;

                    pushService.sendNotification(member.user_id, {
                        title: group.name,
                        body: `${sender?.custom_name || sender?.name || 'Someone'}: ${contentPreview}`,
                        icon: group.avatar || '/icon-192.png',
                        badge: '/badge-72.png',
                        tag: `group:${groupId}`,
                        data: { groupId, messageId: message.id, type: 'group_message' }
                    });
                }
            });

            console.log(`💬 Group message in "${group.name}" from ${clientIP}`);

            callback?.({ success: true, message });

        } catch (error) {
            console.error('❌ Error sending group message:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Get group messages
     * @event group:message:get
     * @param {Object} data - { groupId, limit?, offset? }
     */
    socket.on('group:message:get', (data, callback) => {
        try {
            const { groupId, limit = 50, offset = 0 } = data;

            // Check if member
            if (!groupQueries.isMember(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Not a member of this group' });
            }

            const messages = messageQueries.getGroupMessages(groupId, clientIP, limit, offset);

            callback?.({ success: true, messages });

        } catch (error) {
            console.error('❌ Error getting group messages:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Get older group messages (infinite scroll)
     * @event group:message:getOlder
     * @param {Object} data - { groupId, beforeId, limit? }
     */
    socket.on('group:message:getOlder', (data, callback) => {
        try {
            const { groupId, beforeId, limit = 50 } = data;

            if (!groupQueries.isMember(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Not a member of this group' });
            }

            const messages = messageQueries.getOlderGroupMessages(groupId, clientIP, beforeId, limit);

            callback?.({ success: true, messages, hasMore: messages.length === limit });

        } catch (error) {
            console.error('❌ Error getting older messages:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Typing indicator for group
     * @event group:typing
     * @param {Object} data - { groupId, isTyping }
     */
    socket.on('group:typing', (data) => {
        const { groupId, isTyping } = data;

        console.log(`⌨️ Group typing: ${clientIP} ${isTyping ? 'started' : 'stopped'} typing in group:${groupId}`);

        // Get the room to check members
        const room = io.sockets.adapter.rooms.get(`group:${groupId}`);
        console.log(`   Room: group:${groupId}, Members in room: ${room ? room.size : 0}`);

        // Get user info for the typing user
        const { findUserByIP } = require('../../db/userQueries');
        const user = findUserByIP(clientIP);
        const userName = user?.custom_name || user?.name || clientIP;

        // Broadcast to group except sender
        socket.to(`group:${groupId}`).emit('group:userTyping', {
            groupId,
            userId: clientIP,
            userName: userName,
            isTyping
        });
    });

    /**
     * Search group messages
     * @event group:message:search
     * @param {Object} data - { groupId, query, limit? }
     */
    socket.on('group:message:search', (data, callback) => {
        try {
            const { groupId, query, limit = 50 } = data;

            if (!groupQueries.isMember(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Not a member of this group' });
            }

            const messages = messageQueries.searchGroupMessages(groupId, clientIP, query, limit);

            callback?.({ success: true, messages });

        } catch (error) {
            console.error('❌ Error searching messages:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Get group media
     * @event group:message:getMedia
     * @param {Object} data - { groupId, type?, limit?, offset? }
     */
    socket.on('group:message:getMedia', (data, callback) => {
        try {
            const { groupId, type, limit = 30, offset = 0 } = data;

            if (!groupQueries.isMember(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Not a member of this group' });
            }

            const media = messageQueries.getGroupMedia(groupId, clientIP, type, limit, offset);

            callback?.({ success: true, media });

        } catch (error) {
            console.error('❌ Error getting group media:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Get pinned messages for group
     * @event group:message:getPinned
     * @param {Object} data - { groupId }
     */
    socket.on('group:message:getPinned', (data, callback) => {
        try {
            const { groupId } = data;

            if (!groupQueries.isMember(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Not a member of this group' });
            }

            const pinnedMessages = messageQueries.getGroupPinnedMessages(groupId);

            callback?.({ success: true, pinnedMessages });

        } catch (error) {
            console.error('❌ Error getting pinned messages:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Pin a group message
     * @event group:message:pin
     * @param {Object} data - { groupId, messageId }
     */
    socket.on('group:message:pin', (data, callback) => {
        try {
            const { groupId, messageId } = data;

            // Only admins can pin
            if (!groupQueries.isAdmin(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Only admins can pin messages' });
            }

            const result = messageQueries.pinMessage(messageId, groupId);

            if (result.error) {
                return callback?.({ success: false, error: result.error });
            }

            // Notify group
            io.to(`group:${groupId}`).emit('group:message:pinned', {
                groupId,
                message: result.message,
                pinnedBy: clientIP
            });

            callback?.({ success: true, message: result.message });

        } catch (error) {
            console.error('❌ Error pinning message:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Unpin a group message
     * @event group:message:unpin
     * @param {Object} data - { groupId, messageId }
     */
    socket.on('group:message:unpin', (data, callback) => {
        try {
            const { groupId, messageId } = data;

            // Only admins can unpin
            if (!groupQueries.isAdmin(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Only admins can unpin messages' });
            }

            messageQueries.unpinMessage(messageId);

            // Notify group
            io.to(`group:${groupId}`).emit('group:message:unpinned', {
                groupId,
                messageId,
                unpinnedBy: clientIP
            });

            callback?.({ success: true });

        } catch (error) {
            console.error('❌ Error unpinning message:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Delete a group message
     * @event group:message:delete
     * @param {Object} data - { groupId, messageId, deleteForEveryone? }
     */
    socket.on('group:message:delete', (data, callback) => {
        try {
            const { groupId, messageId, deleteForEveryone = false } = data;

            if (!groupQueries.isMember(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Not a member of this group' });
            }

            // For delete for everyone, check if sender or admin
            if (deleteForEveryone) {
                const message = messageQueries.getMessageById(messageId);
                const isAdmin = groupQueries.isAdmin(groupId, clientIP);

                if (message.sender_id !== clientIP && !isAdmin) {
                    return callback?.({ success: false, error: 'Only sender or admin can delete for everyone' });
                }
            }

            const result = messageQueries.deleteMessage(messageId, clientIP, deleteForEveryone);

            if (result.error) {
                return callback?.({ success: false, error: result.error });
            }

            if (deleteForEveryone) {
                // Notify all group members
                io.to(`group:${groupId}`).emit('group:message:deleted', {
                    groupId,
                    messageId,
                    deletedBy: clientIP
                });
            }

            callback?.({ success: true, deleteForEveryone });

        } catch (error) {
            console.error('❌ Error deleting message:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    /**
     * Edit a group message
     * @event group:message:edit
     * @param {Object} data - { groupId, messageId, content }
     */
    socket.on('group:message:edit', (data, callback) => {
        try {
            const { groupId, messageId, content } = data;

            if (!groupQueries.isMember(groupId, clientIP)) {
                return callback?.({ success: false, error: 'Not a member of this group' });
            }

            const message = messageQueries.editMessage(messageId, clientIP, content);

            if (!message || message.error) {
                return callback?.({ success: false, error: message?.error || 'Failed to edit message' });
            }

            // Notify group
            io.to(`group:${groupId}`).emit('group:message:edited', {
                groupId,
                message
            });

            callback?.({ success: true, message });

        } catch (error) {
            console.error('❌ Error editing message:', error);
            callback?.({ success: false, error: error.message });
        }
    });
}

module.exports = { registerGroupHandlers };

