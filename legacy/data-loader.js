export const DataLoader = {
  periods: [],
  database: {},

  async init() {
    try {
      const res = await fetch('periods.json');
      if (!res.ok) {
        throw new Error(`Não foi possível carregar o arquivo periods.json (status: ${res.status})`);
      }
      this.periods = (await res.json()).periods;
      await Promise.all(this.periods.map(p => this._load(p)));
      return this.database;
    } catch (error) {
      console.error("Erro ao inicializar o DataLoader:", error);
      throw error;
    }
  },

  async _load(period) {
    try {
      const res = await fetch(`data-${period}.json`);
      if (!res.ok) {
        throw new Error(`Não foi possível carregar o arquivo data-${period}.json (status: ${res.status})`);
      }
      this.database[period] = await res.json();
    } catch (error) {
      console.error(`Erro ao carregar dados do período ${period}:`, error);
      throw error;
    }
  }
};
