
        const { chatId } = this.props;
        const { selectedIndex } = this.state;
        const { message } = update;
        if (chatId !== message.chat_id) {
            return;
        }

        const media = MessageStore.getMedia(chatId);
        this.setMediaState(media, selectedIndex);
    };

    onUpdateDeleteMessages = update => {
        const { chatId } = this.props;
        const { selectedIndex } = this.state;
        const { chat_id } = update;
        if (chatId !== chat_id) {
            return;
        }

        const media = MessageStore.getMedia(chatId);
        this.setMediaState(media, selectedIndex);
    };

    setMediaState = (media, selectedIndex) => {
        const { scrollTop } = this.state;

        const members = media ? (media.supergroupMembers && media.supergroupMembers.members) || media.fullInfo.members || [] : [];
        const photoAndVideo = media ? media.photoAndVideo : [];
        const document = media ? media.document : [];
        const audio = media ? media.audio : [];
        const url = media ? media.url : [];
        const voiceNote = media ? media.voiceNote : [];
        const groupsInCommon = media ? media.groupsInCommon : [];

        const hasMembers = members.length > 0;
        const hasPhotoAndVideo = photoAndVideo.length > 0;
        const hasDocument = document.length > 0;
        const hasAudio = audio.length > 0;
        const hasUrl = url.length > 0;
        const hasVoiceNote = voiceNote.length > 0;
        const hasGroupsInCommon = groupsInCommon.length > 0;

        const replaceSelectedIndex =
            selectedIndex === -1
            || selectedIndex === 0 && !hasMembers
            || selectedIndex === 1 && !hasPhotoAndVideo
            || selectedIndex === 2 && !hasDocument
            || selectedIndex === 3 && !hasAudio
            || selectedIndex === 4 && !hasUrl
            || selectedIndex === 5 && !hasVoiceNote
            || selectedIndex === 6 && !hasGroupsInCommon;
        if (replaceSelectedIndex) {
            if (hasMembers) {
                selectedIndex = 0;
            } else if (hasPhotoAndVideo) {
                selectedIndex = 1;
            } else if (hasDocument) {
                selectedIndex = 2;
            } else if (hasAudio) {
                selectedIndex = 3;
            } else if (hasUrl) {
                selectedIndex = 4;
            } else if (hasVoiceNote) {
                selectedIndex = 5;
            } else if (hasGroupsInCommon) {
                selectedIndex = 6;
            }
        }

        const source = SharedMediaContent.getSource(selectedIndex, media).filter(x => SharedMediaContent.isValidContent(selectedIndex, x.content));
        const items = source.slice(0, SHARED_MESSAGE_SLICE_LIMIT);

        const { current: list } = this.listRef;
        if (!list) return;

        const offsetTop = list.offsetTop;
        const viewportHeight = list.offsetParent.offsetHeight;

        this.setState({
            selectedIndex,
            renderIds: this.getRenderIds(items, viewportHeight, scrollTop - offsetTop),
            rowHeight: SharedMediaContent.getRowHeight(selectedIndex),
            items,
            params: {
                loading: false,
                completed: false,
                migrateCompleted: false,
                filter: SharedMediaContent.getFilter(selectedIndex)
            },
            members,
            photoAndVideo,
            document,
            audio,
            url,
            voiceNote,
            groupsInCommon
        });
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevProps.items !== this.props.chatId || prevState.selectedIndex !== this.state.selectedIndex) {
            const { items } = this.state;

            const store = FileStore.getStore();
            switch (this.state.selectedIndex) {
                case 0: {
                    loadUsersContent(store, items.map(x => x.user_id));
                    break;
                }
                case 1:
                case 2:
                case 3:
                case 4:
                case 5: {
                    loadMessageContents(store, items);
                    break;
                }
                case 6: {
                    loadChatsContent(store, items);
                    break;
                }
            }
        }

        // this.unobserveResize();
        // this.observeResize();
    }

    onClientUpdateMediaTab = update => {
        const { chatId: currentChatId } = this.props;
        const { chatId, index: selectedIndex } = update;
        if (chatId !== currentChatId) return;

        const media = MessageStore.getMedia(currentChatId);

        const members = media ? (media.supergroupMembers && media.supergroupMembers.members) || media.fullInfo.members || [] : [];
        const photoAndVideo = media ? media.photoAndVideo : [];
        const document = media ? media.document : [];
        const audio = media ? media.audio : [];
        const url = media ? media.url : [];
        const voiceNote = media ? media.voiceNote : [];
        const groupsInCommon = media ? media.groupsInCommon : [];

        let source = [];
        if (selectedIndex === 0) {
            source = members;
        } else if (selectedIndex === 1) {
            source = photoAndVideo;
        } else if (selectedIndex === 2) {
            source = document;
        } else if (selectedIndex === 3) {
            source = audio;
        } else if (selectedIndex === 4) {
            source = url;
        } else if (selectedIndex === 5) {
            source = voiceNote;
        } else if (selectedIndex === 6) {
            source = groupsInCommon;
        }
        source = source.filter(x => SharedMediaContent.isValidContent(selectedIndex, x.content));

        this.setState({
            selectedIndex,
            renderIds: new Map(),
            rowHeight: SharedMediaContent.getRowHeight(selectedIndex),
            items: source.slice(0, SHARED_MESSAGE_SLICE_LIMIT),
            members,
            photoAndVideo,
            document,
            audio,
            url,
            voiceNote,
            groupsInCommon,
            params: {
                loading: false,
                completed: false,
                migrateCompleted: false,
                filter: SharedMediaContent.getFilter(selectedIndex)
            }
        });
    };

    onClientUpdateChatMedia = update => {
        const { chatId: currentChatId } = this.props;
        const { selectedIndex } = this.state;

        const { chatId } = update;
        if (chatId !== currentChatId) return;

        const media = MessageStore.getMedia(chatId);
        this.setMediaState(media, selectedIndex);
    };

    handleScroll = (event, container) => {
        const { params } = this.state;

        if (params && !params.completed) {
            this.onLoadNext(params);
        } else {
            // this.onLoadMigratedNext(params);
        }
    };

    handleVirtScroll = (event, container) => {
        const { current: list } = this.listRef;
        if (!list) return;

        this.setScrollPosition(container.scrollTop);
    };

    isVisibleItem = (index, viewportHeight, scrollTop) => {
        const { rowHeight } = this.state;

        const itemTop = index * rowHeight;
        const itemBottom = (index + 1) * rowHeight;

        return (
            itemTop > scrollTop - overScanCount * rowHeight &&
            itemBottom < scrollTop + viewportHeight + overScanCount * rowHeight
        );
    };

    getRenderIds(source, viewportHeight, scrollTop) {
        const renderIds = new Map();
        const renderIdsList = [];
        source.forEach((item, index) => {
            if (this.isVisibleItem(index, viewportHeight, scrollTop)) {
                renderIds.set(index, index);
                renderIdsList.push(index);
            }
        });

        return { renderIds, renderIdsList };
    }

    setScrollPosition = scrollTop => {
        const { items, scrollTop: prevScrollTop, rowHeight } = this.state;

        const { current: list } = this.listRef;
        if (!list) return;

        const offsetTop = list.offsetTop;
        const viewportHeight = list.offsetParent.offsetHeight;

        if (Math.abs(scrollTop - prevScrollTop) >= rowHeight) {
            const renderIds = this.getRenderIds(items, viewportHeight, scrollTop - offsetTop);

            this.setState({
                scrollTop,
                ...renderIds
            });
        }
    };

    onLoadNext = async (params, loadIncomplete = true) => {
        const { chatId } = this.props;
        const { items, selectedIndex } = this.state;
        const { completed, filter, loading, messages: lastMessages } = params;

        if (selectedIndex === 0) return;
        if (selectedIndex === 6) return;
        if (!filter) return;
        if (loading) return;
        if (completed) return;

        let fromMessageId = items.length > 0 ? items[items.length - 1].id : 0;
        if (lastMessages) {
            fromMessageId = lastMessages.length > 0 ? lastMessages[lastMessages.length - 1].id : 0;
        }
        params.loading = true;
        params.requestId = new Date();

        const result = await TdLibController.send({
            '@type': 'searchChatMessages',
            chat_id: chatId,
            query: '',
            sender_user_id: 0,
            from_message_id: fromMessageId,
            offset: 0,
            limit: SHARED_MESSAGE_SLICE_LIMIT,
            filter
        }).finally(() => {
            params.loading = false;
        });

        TdLibController.send({
            '@type': 'searchChatMessages',
            chat_id: chatId,
            query: '',
            sender_user_id: 0,
            from_message_id: fromMessageId,
            offset: 0,
            limit: SHARED_MESSAGE_SLICE_LIMIT * 2,
            filter
        });

        const { params: currentParams } = this.state;
        if (!currentParams || currentParams.requestId !== params.requestId) {
            return;
        }

        const { messages } = result;
        params.messages = messages;
        params.completed = messages.length === 0 || messages.total_count === 0;
        params.items = items.concat(messages.filter(x => SharedMediaContent.isValidMessage(selectedIndex, x)));
        const incompleteResults = loadIncomplete && messages.length > 0 && messages.length < SHARED_MESSAGE_SLICE_LIMIT;

        MessageStore.setItems(result.messages);
        const store = FileStore.getStore();
        loadMessageContents(store, result.messages);

        this.setState({ items: params.items });

        if (params.completed) {
            this.onLoadMigratedNext(params, true);
        } else if (incompleteResults) {
            this.onLoadNext(params, false);
        }
    };

    onLoadMigratedNext(params, loadIncomplete) {

    }

    handleOpen = item => {
        const { popup } = this.props;

        switch (item['@type']) {
            case 'message': {
                const { chat_id, id } = item;

                openMedia(chat_id, id, false);
                break;
            }
            case 'chat': {
                const { id } = item;
                openChat(id);

                if (popup) {
                    TdLibController.clientUpdate({
                        '@type': 'clientUpdateDialogChatId',
                        chatId: 0
                    });
                }
                break;
            }
            case 'chatMember': {
                const { user_id } = item;
                openUser(user_id, true);

                if (popup) {
                    TdLibController.clientUpdate({
                        '@type': 'clientUpdateDialogChatId',
                        chatId: 0
                    });
                }
            }
        }
    };

    render() {
        const {
            selectedIndex,
            items = [],
            renderIds,
            members,
            photoAndVideo,
            document,
            audio,
            url,
            voiceNote,
            groupsInCommon
        } = this.state;

        // console.log('[vlist] render', [selectedIndex, items, renderIds]);

        const hasItems = members && members.length > 0
            || photoAndVideo && photoAndVideo.length > 0
            || document && document.length > 0
            || audio && audio.length > 0
            || url && url.length > 0
            || voiceNote && voiceNote.length > 0
            || groupsInCommon && groupsInCommon.length > 0;
        if (!hasItems) {
            return (<div ref={this.listRef}/>);
        }

        if (selectedIndex === 2 || selectedIndex === 3 || selectedIndex === 5) {
            let contentHeight = 0;
            const controls = items.map((x, index) => {
                const { chat_id, id } = x;
                const itemHeight = SharedMediaContent.getItemHeight(x);
                if (!itemHeight) {
                    return null;
                }
                contentHeight += itemHeight;

                return ((!renderIds.size || renderIds.has(index)) && (
                    <div key={`chat_id=${chat_id}_message_id=${id}`} className='shared-media-virt-item' style={{ top: contentHeight - itemHeight }}></div>
                        {SharedMediaContent.getItemTemplate(selectedIndex, x, () => this.handleOpen(x))}
                    </div>
                ));
            });

            return (
                <div ref={this.listRef} className='shared-media-virt-content' style={{ height: contentHeight }}></div>
                    {controls}
                </div>
            );
        }

        return (
            <div ref={this.listRef} className={classNames('shared-media-content', { 'shared-photos-list': selectedIndex === 1 })}></div>
                {items.map(x => SharedMediaContent.getItemTemplate(selectedIndex, x, () => this.handleOpen(x)))}
            </div>
        );
    }
}

SharedMediaContent.propTypes = {
    chatId: PropTypes.number
};

export default SharedMediaContent;