import EventEmitter from 'events';

export const Events = new EventEmitter();
Events.setMaxListeners(0);

