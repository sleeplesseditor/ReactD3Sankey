import React, { Component } from 'react';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.emptyForm = {
      month: '',
      volume: '',
      stream: '',
      counterparty: '',
    };

    this.counterParties = [
      {
        id: 'CPA',
        name: 'Counterparty A',
      },
      {
        id: 'CPB',
        name: 'Counterparty B',
      },
      {
        id: 'CPC',
        name: 'Counterparty C',
      },
    ];

    this.streams = [
      {
        id: 'stream-1',
        name: 'Stream 1',
        source: 0,
        target: 1,
      },
      {
        id: 'stream-2',
        name: 'Stream 2',
        source: 1,
        target: 2,
      },
      {
        id: 'stream-3',
        name: 'Stream 3',
        source: 1,
        target: 3,
      },
      {
        id: 'stream-4',
        name: 'Stream 4',
        source: 3,
        target: 4,
      },
      {
        id: 'stream-5',
        name: 'Stream 5',
        source: 3,
        target: 5,
      },
    ];

    this.state = {
      tab: 'shipper',
      ctab: 'terminal',
      shipper: 'CPA',
      isEditing: false,
      trades: [],
      operatorStreams: {},
      configs: {
        toggleFlow: false,
      },
      form: {
        ...this.emptyForm,
      },
      terminals: [
        {
          id: 0,
          name: 'Node 1',
          totalCapacity: 200,
          color: '#0074D9',
        },
        {
          id: 1,
          name: 'Node 2',
          totalCapacity: 200,
          color: '#85144b',
        },
        {
          id: 2,
          name: 'Node 3',
          totalCapacity: 200,
          color: '#39CCCC',
        },
        {
          id: 3,
          name: 'Node 4',
          totalCapacity: 200,
          color: '#B10DC9',
        },
        {
          id: 4,
          name: 'Node 5',
          totalCapacity: 200,
          color: '#001f3f',
        },
        {
          id: 5,
          name: 'Node 6',
          totalCapacity: 200,
          color: '#2ECC40',
        },
      ],
    };
    this.streams.forEach((stream) => {
      const operatorStream = {
        ...stream,
        nomination: 0,
      };
      operatorStream.allocations = {};
      this.counterParties.forEach((cp) => {
        operatorStream.allocations[cp.id] = 0;
      });
      this.state.operatorStreams[stream.id] = operatorStream;
    });
    this.handleTradeFormChange = this.handleTradeFormChange.bind(this);
    this.handleOperatorFormChange = this.handleOperatorFormChange.bind(this);
  }

  componentDidMount() {
    this.graphContainer = document.getElementById('visualisation-container');
    this.updateGraph();
  }

  updateGraph = (reload) => {
    const nodes = this.state.terminals;

    const getCapacityValue = (streamSource) => {
      const { totalCapacity } = nodes[streamSource];
      const commonSource = this.streams.filter(p => p.source === streamSource).length;
      return totalCapacity / commonSource;
    };
    const getAllocationValue = (streamId) => {
      let allocationValue = 0;
      if (this.state.tab === 'shipper') {
        allocationValue = this.state.operatorStreams[streamId].allocations[this.state.shipper];
      } else if (this.state.tab === 'operator') {
        const opa = this.state.operatorStreams[streamId].allocations;
        allocationValue = Object.keys(opa).map(cp => opa[cp]).reduce((total, cp) => total + cp);
      }
      return allocationValue;
    };

    const nominations = this.streams.map((stream) => {
      const nomination = {
        ltype: 'nomination',
        ...stream,
        value: 0,
        color: '#0074D9',
      };
      this.state.trades.forEach((trade) => {
        if (trade.stream && trade.stream.id === stream.id) {
          nomination.value += parseInt(trade.volume);
        }
      });

      const allocationValue = getAllocationValue(stream.id);
      const capacity = getCapacityValue(stream.source);

      if (nomination.value > allocationValue) {
        nomination.color = '#FF4136';
        nomination.overload = nomination.value;
        nomination.value = allocationValue < capacity ? allocationValue : capacity;
      }

      return nomination;
    });

    const allocations = this.streams.map((stream) => {
      let allocationValue = getAllocationValue(stream.id);
      const nomination = nominations.find(nom => nom.id === stream.id);
      const capacity = getCapacityValue(stream.source);
      console.log(stream.name, 'alloc', allocationValue, 'nom', nomination.value, 'capacity', capacity);

      if (allocationValue >= nomination.value) {
        allocationValue -= nomination.value;
      }

      const allocation = {
        ...stream,
        value: allocationValue,
        id: `${stream.id}-allocation`,
        name: `${stream.name} Allocation`,
        color: '#FFDC00',
      };

      if (capacity - (nomination.value + allocationValue) < 0) {
        allocation.overload = allocation.value;
        allocation.value = capacity - nomination.value;
        allocation.color = '#FF851B';
      }

      return allocation;
    });

    const spareCapacities = this.streams.map((stream) => {
      let spareValue = 0;
      let name = '';
      if (this.state.tab === 'operator') {
        name = `${stream.name} Spare Capacity`;
      }

      const allocationValue = getAllocationValue(stream.id);
      const nomination = nominations.find(nom => nom.id === stream.id);
      const capacity = getCapacityValue(stream.source);

      if (capacity - (nomination.value + allocationValue) < 0) {
        spareValue = 0;
      } else {
        spareValue = capacity - allocationValue;
      }
      console.log('SPARE', stream.name, 'alloc', allocationValue, 'nom', nomination.value, 'spare', spareValue, 'capacity', capacity);
      return {
        ...stream,
        value: spareValue,
        id: `${stream.id}-spare`,
        name,
        color: '#AAAAAA',
      };
    });

    const links = [...spareCapacities, ...allocations, ...nominations];
    const graphData = {
      nodes,
      links,
    };
    console.log('graphData', graphData);
    this.graphContainer.setAttribute('data-init', JSON.stringify(graphData));
    if (reload) {
      this.graphContainer.setAttribute('data-reload', new Date().getTime());
    }
  }

  updateOperatorStreams = () => {
    const operatorStreams = this.state.operatorStreams;
    this.streams.forEach((stream) => {
      let nomination = 0;
      this.state.trades.forEach((trade) => {
        if (trade.stream && trade.stream.id === stream.id) {
          nomination += parseInt(trade.volume);
        }
      });
      operatorStreams[stream.id].nomination = nomination;
    });
    this.setState({ operatorStreams });
  }

  getStreamById = id => this.streams.find(stream => stream.id === id)

  getCounterPartyById = id => this.counterParties.find(cp => cp.id === id)

  getOperators = () => {
    const trades = this.state.trades;
    const stream = this.state.streams;

    const operators = [];
    trades.reduce((res, trade) => {
      const accIndex = res.stream.id;
      if (!res[accIndex]) {
        res[accIndex] = {
          id: new Date().getTime(),
          stream: res.stream.id,
          nomination: 0,
          allocations: {
            CPA: 0,
            CPB: 0,
            CPC: 0,
          },
        };
        operators.push(res[accIndex]);
      }
      res[accIndex].nomination += parseInt(trade.volume);
      return res;
    }, {});
    return operators;
  }

  editTrade = (trade) => {
    const form = { ...trade };
    form.stream = trade.stream.id;
    form.counterparty = trade.counterparty.id;
    console.log('Trade Edited', form);
    this.setState({
      form,
      isEditing: true,
      editTrade: trade,
    });
  }

  deleteTrade = (tradeId, index) => {
    console.log('Trade Deleted', tradeId);
    const trades = this.state.trades;
    const deletedTrades = trades.filter((trade, index) => trade.id !== tradeId);
    console.log('deleted trades', deletedTrades);
    this.setState({
      trades: deletedTrades.slice(0),
      isEditing: false,
    }, () => {
      this.updateOperatorStreams();
      this.updateGraph();
    });
  }

  handleTrade = (tradeId) => {
    console.log('Trade Submitted');

    const newTrade = { ...this.state.form };
    newTrade.stream = this.getStreamById(this.state.form.stream);
    newTrade.counterparty = this.getCounterPartyById(this.state.form.counterparty);
    // TODO validation
    const trades = this.state.trades;
    if (this.state.isEditing) {
      const editTrade = this.state.editTrade;
      const editTradeIndex = this.state.trades.findIndex(trade => trade.id === editTrade.id);
      trades[editTradeIndex] = newTrade;
    } else {
      newTrade.id = new Date().getTime();
      trades.push(newTrade);
    }

    this.setState({
      ...trades,
      isEditing: false,
      form: { ...this.emptyForm },
    }, () => {
      console.log(this.state);
      this.updateOperatorStreams();
      this.updateGraph();
    });
  }

  handleTradeFormChange = (e) => {
    e.preventDefault();
    const target = e.target;
    const form = this.state.form;
    form[target.name] = target.value;
    this.setState({
      form: { ...form },
    });
  }

  handleTerminalCapacityChange = (e, terminalId) => {
    e.preventDefault();
    const target = e.target;
    const terminals = this.state.terminals;
    terminals[terminalId].totalCapacity = target.value;
    this.setState({
      terminals,
    }, () => {
      this.updateGraph(true); // reload
    });
  }

  handleOperatorFormChange = (e, streamId, counterPartyId) => {
    e.preventDefault();
    const target = e.target;
    const operatorStreams = this.state.operatorStreams;
    operatorStreams[streamId].allocations[counterPartyId] = parseInt(target.value);
    this.setState({ operatorStreams }, () => {
      this.updateGraph();
    });
  }

  handleFlowDirection = (e) => {
    const configs = this.state.configs;
    configs.toggleFlow = !configs.toggleFlow;
    this.setState({
      configs,
    });
    const canvasFlow = document.querySelector('.sk-canvas');
    canvasFlow && canvasFlow.classList.toggle('canvas-hidden');
  }

  handleTabSwitch = (tab) => {
    this.setState({ tab }, () => {
      this.updateGraph();
    });
  }

  handleConfigTabSwitch = (ctab) => {
    this.setState({ ctab });
  };

  render() {
    return (
      <div className="App">
        <div className="App-header container is-fluid">
          <div className="columns">
            <div className="column is-8">
              <div className="box">
                <div className="tabs">
                  <ul>
                    <li className={this.state.tab === 'shipper' ? 'is-active' : ''}><a onClick={() => { this.handleTabSwitch('shipper'); }}>Supplier</a></li>
                    <li className={this.state.tab === 'operator' ? 'is-active' : ''}><a onClick={() => { this.handleTabSwitch('operator'); }}>Operator</a></li>
                  </ul>
                </div>
                {this.state.tab === 'shipper' && (
                <div className="tab-content-shipper">
                  <h1 className="box__heading">Trade History</h1>
                  <form>
                    <table className="table is-striped is-fullwidth">
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Volume</th>
                          <th>Stream</th>
                          <th>Counterparty</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {this.state.trades && this.state.trades.map((trade, index) => (
                          <tr key={trade.id}>

                            <td>
                              {trade.month}
                            </td>

                            <td>
                              {trade.volume}
                            </td>

                            <td>
                              {trade.stream && trade.stream.name}
                            </td>

                            <td>
                              {trade.counterparty && trade.counterparty.name}
                            </td>
                            <td>
                              <div className="field is-grouped">
                                <p className="control">
                                  <button name="edit-button" className="button is-warning is-small" onClick={() => { this.editTrade(trade); }} type="button">Edit</button>
                                </p>
                                <p className="control">
                                  <button name="delete-button" className="button is-danger is-small" onClick={() => { this.deleteTrade(trade.id, index); }} type="button">Delete</button>
                                </p>
                              </div>
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td>
                            <input className="input is-fullwidth" type="date" name="month" value={this.state.form.month} onChange={this.handleTradeFormChange} />
                          </td>
                          <td>
                            <input className="input is-fullwidth" type="number" step="100" name="volume" value={this.state.form.volume} onChange={this.handleTradeFormChange} />
                          </td>
                          <td>
                            <div className="select is-fullwidth">
                              <select name="stream" value={this.state.form.stream} onChange={this.handleTradeFormChange}>
                                <option>Select Stream</option>
                                {this.streams.map(stream => (
                                  <option value={stream.id} key={stream.id}>{stream.name}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td colSpan="2">
                            <div className="select is-fullwidth">
                              <select name="counterparty" value={this.state.form.counterparty} onChange={this.handleTradeFormChange}>
                                <option>Select Counterparty</option>
                                {this.counterParties.map(cp => (
                                  <option value={cp.id} key={cp.id}>{cp.name}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                    <button className={`button ${this.state.isEditing ? 'is-warning' : 'is-primary'}`} type="button" name="submit-button" onClick={() => { this.handleTrade(); }}>
                      {this.state.isEditing ? 'Edit Trade' : 'Save Trade'}
                    </button>
                  </form>
                </div>
                )}
                {this.state.tab === 'operator' && (
                <div className="tab-content-operator">
                  <h1 className="box__heading">Stream Allocation</h1>
                  <form>
                    <table className="table is-striped is-fullwidth">
                      <thead>
                        <tr>
                          <th>Stream</th>
                          <th>Nominations</th>
                          <th>Allocation (Counterparty A)</th>
                          <th>Allocation (Counterparty B)</th>
                          <th>Allocation (Counterparty C)</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(this.state.operatorStreams).map((operatorStreamId) => {
                          const operatorStream = this.state.operatorStreams[operatorStreamId];
                          return (
                            <tr key={operatorStream.id}>
                              <td>
                                {operatorStream.name}
                              </td>
                              <td>
                                {operatorStream.nomination}
                              </td>
                              {this.counterParties.map(cp => (
                                <td key={`${operatorStreamId}-${cp.id}`}>
                                  <input className="input is-fullwidth" type="number" step="100" name="allocation" value={operatorStream.allocations[cp.id]} onChange={(e) => { this.handleOperatorFormChange(e, operatorStream.id, cp.id); }} />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </form>
                </div>
                )}
              </div>
            </div>
            <div className="column is-4">
              <div className="box">
                <div className="tabs">
                  <ul>
                    <li className={this.state.ctab === 'terminal' ? 'is-active' : ''}><a onClick={() => { this.handleConfigTabSwitch('terminal'); }}>Terminals</a></li>
                    <li className={this.state.ctab === 'config' ? 'is-active' : ''}><a onClick={() => { this.handleConfigTabSwitch('config'); }}>Configs</a></li>
                  </ul>
                </div>
                {this.state.ctab === 'terminal' && (
                  <div>
                    <table className="table is-fullwidth">
                      <tbody>
                        {this.state.terminals.map(terminal => (
                          <tr key={terminal.name}>
                            <td><span className="terminal-color" style={{ backgroundColor: terminal.color }} /> <span>{terminal.name}</span></td>
                            <td>
                              <input className="input has-text-right" type="number" step="100" name="terminal-name" value={terminal.totalCapacity} onChange={(e) => { this.handleTerminalCapacityChange(e, terminal.id); }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {this.state.ctab === 'config' && (
                  <div>
                    <h1 className="box__heading">Configure Settings</h1>
                    <div className="field is-grouped">
                      <p className="control">
                        <button className="button is-info" onClick={this.handleFlowDirection}>{this.state.configs.toggleFlow ? 'Hide' : 'Show'} Flow</button>
                      </p>
                      <p className="control">
                        <button className="button is-info" onClick={() => { this.updateGraph(true); }}>Reload Graph</button>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
