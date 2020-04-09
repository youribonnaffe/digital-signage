'use strict';

const {Datastore} = require('@google-cloud/datastore');

const CLIENT_UP = 'UP';
const CLIENT_DOWN = 'DOWN';

class Repository {

  constructor() {
    this.datastore = new Datastore();
  }

  upsertClient(client) {
    return this.datastore.upsert({
      key: this.datastore.key(['client', `${client.network}_${client.name}`]),
      data: client,
    });
  }

  async clientJoined(client) {
    const [entity] = await this.datastore
      .get(this.datastore.key(['client', `${client.network}_${client.name}`]));

    if (entity) {
      console.log("existing client")
      client.url = entity.url;
    }
    client.status = CLIENT_UP;
    await this.upsertClient(client);
    return client;
  }

  async clientLeft(client) {
    const query = this.datastore
      .createQuery('client')
      .filter('socket', '=', client.socket);

    const [entities] = await this.datastore.runQuery(query);
    const entity = entities[0];
    if (!entity) {
      return;
    }
    entity.status = CLIENT_DOWN;

    await this.datastore.update(entity);

    return entity;
  }

  async updateClientUrl(client) {
    const [entity] = await this.datastore
      .get(this.datastore.key(['client', `${client.network}_${client.name}`]));

    entity.url = client.url;

    this.datastore.update(entity);
  }

  getUpClients(network) {
    return this.datastore.runQuery(
      this.datastore.createQuery('client')
        .filter('status', '=', CLIENT_UP)
        .filter('network', '=', network));
  }
}

module.exports = {
  CLIENT_UP, CLIENT_DOWN, Repository
};
