import * as React from 'react';
import './App.css';
import { counterParties, defaultTerminalValues, streams } from '@helpers/sankeyHelpers';

const emptyForm = {
  month: '',
  volume: '',
  stream: '',
  counterparty: ''
}

const App = () => {
  const [tab, setTab] = React.useState<string>('shipper');
  const [ctab, setCtab] = React.useState<string>('terminal');
  const [shipper, setShipper] = React.useState<string>('CPA');
  const [isEditing, setIsEditing] = React.useState<boolean>(false);
  const [editTrade, setEditTrade] = React.useState();
  const [trades, setTrades] = React.useState([]);
  const [operatorStreams, setOperatorStreams] = React.useState({});
  const [configs, setConfigs] = React.useState({ toggleFlow: false });
  const [terminals, setTerminals] = React.useState(defaultTerminalValues);
  const [form, setForm] = React.useState(emptyForm);

  const graphContainer = document.getElementById('visualisation-container');

  const updateGraph = (reload?: boolean, terminalValues = terminals) => {
    const nodes = terminalValues;

    const getCapacityValue = (streamSource) => {
      const { totalCapacity } = nodes[streamSource];
      const commonSource = streams.filter(p => p.source === streamSource).length;
      return totalCapacity / commonSource;
    };

    const getAllocationValue = (streamId) => {
      console.log('STREAM ID', operatorStreams, streamId)
      let allocationValue = 0;
      if (tab === 'shipper') {
        allocationValue = operatorStreams[streamId]?.allocations[shipper];
      } else if (tab === 'operator') {
        const opa = operatorStreams[streamId]?.allocations;
        allocationValue = Object.keys(opa).map(cp => opa[cp]).reduce((total, cp) => total + cp);
      }
      return allocationValue;
    };

    const nominations = streams.map((stream) => {
      const nomination = {
        ltype: 'nomination',
        ...stream,
        value: 0,
        color: '#0074D9',
      };
      trades.forEach((trade) => {
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

    const allocations = streams.map((stream) => {
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

    const spareCapacities = streams.map((stream) => {
      let spareValue = 0;
      let name = '';
      if (tab === 'operator') {
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
    graphContainer.setAttribute('data-init', JSON.stringify(graphData));
    if (reload) {
      graphContainer.setAttribute('data-reload', new Date().getTime());
    }
  }

  const updateOperatorStreams = () => {
    const operatorStreamsForUpdate = operatorStreams;
    streams.forEach((stream) => {
      let nomination = 0;
      trades.forEach((trade) => {
        if (trade.stream && trade.stream.id === stream.id) {
          nomination += parseInt(trade.volume);
        }
      });
      operatorStreamsForUpdate[stream.id].nomination = nomination;
    });
    setOperatorStreams(operatorStreamsForUpdate)
  }

  const getStreamById = (id) => streams.find(stream => stream.id === id);

  const getCounterPartyById = (id) => counterParties.find(cp => cp.id === id);

  const editTradeAction = async (trade) => {
    const formforUpdate = { ...trade };
    formforUpdate.stream = trade.stream.id;
    formforUpdate.counterparty = trade.counterparty.id;
    console.log('Trade Edited', formforUpdate);
    await setForm(formforUpdate);
    await setIsEditing(true);
    await setEditTrade(trade);
  }

  const deleteTrade = async (tradeId, index) => {
    console.log('Trade Deleted', tradeId);
    const tradesForDeletion = trades;
    const deletedTrades = tradesForDeletion.filter((trade, index) => trade.id !== tradeId);
    console.log('deleted trades', deletedTrades);

    await setTrades(deletedTrades.slice(0));
    await setIsEditing(false);

    updateOperatorStreams();
    updateGraph();
  }

  const handleTrade = async (tradeId?) => {
    console.log('Trade Submitted');

    const newTrade = { ...form };
    newTrade.stream = getStreamById(form.stream);
    newTrade.counterparty = getCounterPartyById(form.counterparty);
    // TODO validation
    
    const tradesforEditing = trades;
    if (isEditing) {
      const editingTrade = editTrade;
      const editTradeIndex = tradesforEditing.findIndex(trade => trade.id === editingTrade.id);
      trades[editTradeIndex] = newTrade;
    } else {
      newTrade.id = new Date().getTime();
      tradesforEditing.push(newTrade);
    }

    await setTrades(tradesforEditing);
    await setIsEditing(false);
    await setForm(emptyForm);

    updateOperatorStreams();
    updateGraph();
  }

  const handleTradeFormChange = async (e: any) => {
    e.preventDefault();
    const formState = {
      ...form,
      [e.target.name]: e.target.value
    }

    await setForm(formState);
  }

  const handleTerminalCapacityChange = (e, terminalId: number) => {
    console.log('TARG', terminalId, terminals, e.target.value)
    e.preventDefault();
    const terminalsForChange = [...terminals];
    terminalsForChange[terminalId] = {
      ...terminals[terminalId],
      totalCapacity: Number(e.target.value)
    };
    
    console.log('TERM FOR CHANGE', terminalsForChange)
    setTerminals(terminalsForChange);
    updateGraph(true, terminalsForChange);
  }

  const handleOperatorFormChange = async (e: any, streamId: string, counterPartyId: string) => {
    e.preventDefault();
    const operatorStreamsForUpdate = {
      ...operatorStreams,
      [streamId]: {
        ...operatorStreams[streamId],
        allocations: {
          ...operatorStreams[streamId].allocations,
          [counterPartyId]: parseInt(e.target.value)
        }
      } 
    };
    await setOperatorStreams(operatorStreamsForUpdate);
    updateGraph();
  }

  const handleFlowDirection = (e) => {
    const configsForUpdate = configs;
    configsForUpdate.toggleFlow = !configs.toggleFlow;
    setConfigs(configsForUpdate);
    const canvasFlow = document.querySelector('.sk-canvas');
    canvasFlow && canvasFlow.classList.toggle('canvas-hidden');
  }


  const handleConfigTabSwitch = (ctabValue: string) => {
    setCtab(ctabValue);
  };

  const handleTabSwitch = async (tabValue: string) => {
    await setTab(tabValue);
    updateGraph();
  }

  React.useEffect(() => {
    streams.forEach((stream) => {
      const operatorStream = {
        ...stream,
        allocations: {},
        nomination: 0,
      };

      counterParties.forEach((cp) => {
        operatorStream.allocations[cp.id] = 0;
      });

      setOperatorStreams((prevState) => ({
        ...prevState,
        [stream.id]: operatorStream
      }))

    });
    updateGraph();
  }, []);

  return (
    <div className="App">
        <div className="App-header container is-fluid">
          <div className="columns">
            <div className="column is-8">
              <div className="box">
                <div className="tabs">
                  <ul>
                    <li 
                      className={tab === 'shipper' ? 'is-active' : ''}
                    >
                      <a onClick={() => { handleTabSwitch('shipper'); }}>Supplier</a>
                    </li>
                    <li 
                      className={tab === 'operator' ? 'is-active' : ''}
                    >
                      <a onClick={() => { handleTabSwitch('operator'); }}>Operator</a>
                    </li>
                  </ul>
                </div>
                {tab === 'shipper' && (
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
                        {trades && trades.map((trade, index) => (
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
                                  <button 
                                    className="button is-warning is-small" 
                                    name="edit-button" 
                                    onClick={() => { editTradeAction(trade); }} 
                                    type="button">
                                      Edit
                                  </button>
                                </p>
                                <p className="control">
                                  <button 
                                    className="button is-danger is-small" 
                                    name="delete-button" 
                                    onClick={() => { deleteTrade(trade.id, index); }} 
                                    type="button"
                                  >
                                    Delete
                                  </button>
                                </p>
                              </div>
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td>
                            <input 
                              className="input is-fullwidth" 
                              name="month" 
                              onChange={handleTradeFormChange} 
                              type="date" 
                              value={form.month} 
                            />
                          </td>
                          <td>
                            <input 
                              className="input is-fullwidth" 
                              name="volume" 
                              onChange={handleTradeFormChange} 
                              step="100" 
                              type="number" 
                              value={form.volume} 
                            />
                          </td>
                          <td>
                            <div className="select is-fullwidth">
                              <select name="stream" value={form.stream} onChange={handleTradeFormChange}>
                                <option>Select Stream</option>
                                {streams.map(stream => (
                                  <option value={stream.id} key={stream.id}>{stream.name}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td colspan="2">
                            <div className="select is-fullwidth">
                              <select name="counterparty" value={form.counterparty} onChange={handleTradeFormChange}>
                                <option>Select Counterparty</option>
                                {counterParties.map(cp => (
                                  <option value={cp.id} key={cp.id}>{cp.name}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                    <button 
                      className={`button ${isEditing ? 'is-warning' : 'is-primary'}`} 
                      name="submit-button" 
                      onClick={() => { handleTrade(); }}
                      type="button" 
                    >
                      {isEditing ? 'Edit Trade' : 'Save Trade'}
                    </button>
                  </form>
                </div>
                )}
                {tab === 'operator' && (
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
                        {Object.keys(operatorStreams).map((operatorStreamId) => {
                          const operatorStream = operatorStreams[operatorStreamId];
                          return (
                            <tr key={operatorStream.id}>
                              <td>
                                {operatorStream.name}
                              </td>
                              <td>
                                {operatorStream.nomination}
                              </td>
                              {counterParties.map(cp => (
                                <td key={`${operatorStreamId}-${cp.id}`}>
                                  <input 
                                    className="input is-fullwidth" 
                                    name="allocation" 
                                    onChange={(e) => { handleOperatorFormChange(e, operatorStream.id, cp.id); }} 
                                    step="100" 
                                    type="number" 
                                    value={operatorStream.allocations[cp.id]} 
                                  />
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
                    <li 
                      className={ctab === 'terminal' ? 'is-active' : ''}
                    >
                      <a onClick={() => { handleConfigTabSwitch('terminal'); }}>Terminals</a>
                    </li>
                    <li 
                      className={ctab === 'config' ? 'is-active' : ''}
                    >
                      <a onClick={() => { handleConfigTabSwitch('config'); }}>Configs</a>
                    </li>
                  </ul>
                </div>
                {ctab === 'terminal' && (
                  <div>
                    <table className="table is-fullwidth">
                      <tbody>
                        {terminals.map(terminal => (
                          <tr key={terminal.name}>
                            <td>
                              <span 
                                className="terminal-color" 
                                style={{ backgroundColor: terminal.color }} 
                              /> 
                              <span>{terminal.name}</span>
                            </td>
                            <td>
                              <input 
                                className="input has-text-right" 
                                name="terminal-name" 
                                onChange={(e) => handleTerminalCapacityChange(e, terminal.id) }
                                step="100"
                                type="number" 
                                value={terminal.totalCapacity}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {ctab === 'config' && (
                  <div>
                    <h1 className="box__heading">Configure Settings</h1>
                    <div className="field is-grouped">
                      <p className="control">
                        <button 
                          className="button is-info" 
                          onClick={handleFlowDirection}
                        >
                          {configs.toggleFlow ? 'Hide' : 'Show'} Flow
                        </button>
                      </p>
                      <p className="control">
                        <button className="button is-info" onClick={() => { updateGraph(true); }}>Reload Graph</button>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  )
}

export default App;