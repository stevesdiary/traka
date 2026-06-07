declare module 'winston-loki' {
  import TransportStream = require('winston-transport');

  export default class LokiTransport extends TransportStream {
    constructor(options: any);
  }
}
