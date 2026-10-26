import * as React from 'react';
import './App.css';
import { counterParties, defaultTerminalValues, streams } from '@helpers/sankeyHelpers';
import Config from '@components/Config';
import TerminalMenu from '@components/TerminalMenu';
import TradeForm from '@components/TradeForm';
import StreamForm from '@components/StreamForm';

type TradeForm = {
  month: string;
  volume: string;
  stream: string;
  counterparty: string;
};

type OperatorStream = (typeof streams)[number] & {
  allocations: Record<string, number>;
  nomination: number;
};

interface TradeProps {
  counterparty: {
    id: string,
    name: string
  },
  id: number,
  month: string,
  stream: {
    id: string,
    name: string,
    source: number,
    target: number
  }
  volume: string,
}

interface IFormInput {
    counterparty: string;
    month: string;
    stream: string;
    volume: string;
}

const App = () => {
  const [tab, setTab] = React.useState<string>('shipper');
  const [ctab, setCtab] = React.useState<string>('terminal');
  const [shipper, _] = React.useState<string>('CPA');
  const [isEditing, setIsEditing] = React.useState<boolean>(false);
  const [editTrade, setEditTrade] = React.useState<TradeProps | null>(null);
  const [trades, setTrades] = React.useState<TradeProps[]>([]);
  const [operatorStreams, setOperatorStreams] = React.useState<Record<string, OperatorStream>>({});
  const [terminals, setTerminals] = React.useState(defaultTerminalValues);

  const graphContainer = document.getElementById('visualisation-container');

  const getCapacityValue = (streamSource: number, terminalValues: typeof terminals = terminals) => {
    const totalCapacity = Number(terminalValues[streamSource]?.totalCapacity ?? 0);
    const commonSource = streams.filter(stream => stream.source === streamSource).length;
    return commonSource > 0 ? totalCapacity / commonSource : 0;
  };

  const propagateTerminalCapacity = (terminalValues: typeof terminals, changedTerminalId: number) => {
    const outgoingCounts = new Map<number, number>();
    const incomingCounts = new Map<number, number>();
    const downstreamNodes = new Map<number, number[]>();

    terminals.forEach(terminal => {
      incomingCounts.set(terminal.id, 0);
      downstreamNodes.set(terminal.id, []);
    });

    streams.forEach(stream => {
      outgoingCounts.set(stream.source, (outgoingCounts.get(stream.source) ?? 0) + 1);
      incomingCounts.set(stream.target, (incomingCounts.get(stream.target) ?? 0) + 1);
      downstreamNodes.get(stream.source)?.push(stream.target);
    });

    const nodesReady = terminals
      .filter(terminal => incomingCounts.get(terminal.id) === 0)
      .map(terminal => terminal.id);
    const topologicalOrder: number[] = [];

    while (nodesReady.length > 0) {
      const nodeId = nodesReady.shift()!;
      topologicalOrder.push(nodeId);

      downstreamNodes.get(nodeId)?.forEach(targetId => {
        const remainingInputs = (incomingCounts.get(targetId) ?? 0) - 1;
        incomingCounts.set(targetId, remainingInputs);
        if (remainingInputs === 0) nodesReady.push(targetId);
      });
    }

    if (topologicalOrder.length !== terminals.length) {
      throw new Error('Cannot propagate terminal capacity through a cyclic stream graph.');
    }

    const terminalIndexes = new Map(terminalValues.map((terminal, index) => [terminal.id, index]));
    const affectedNodes = new Set<number>([changedTerminalId]);

    topologicalOrder.forEach(nodeId => {
      if (!affectedNodes.has(nodeId)) return;

      const nodeIndex = terminalIndexes.get(nodeId);
      if (nodeIndex === undefined) return;

      downstreamNodes.get(nodeId)?.forEach(targetId => affectedNodes.add(targetId));

      if (nodeId === changedTerminalId || !streams.some(stream => stream.target === nodeId)) return;

      const incomingCapacity = streams
        .filter(stream => stream.target === nodeId)
        .reduce((total, stream) => {
          const sourceIndex = terminalIndexes.get(stream.source);
          const sourceCapacity = sourceIndex === undefined
            ? 0
            : Number(terminalValues[sourceIndex].totalCapacity);
          const sourceOutgoingCount = outgoingCounts.get(stream.source) ?? 0;
          return total + (sourceOutgoingCount > 0 ? sourceCapacity / sourceOutgoingCount : 0);
        }, 0);

      terminalValues[nodeIndex] = {
        ...terminalValues[nodeIndex],
        totalCapacity: incomingCapacity,
      };
    });

    return terminalValues;
  };

  const getRemainingAllocationCapacity = (streamId: string, counterPartyId: string) => {
    const stream = streams.find(item => item.id === streamId);
    if (!stream) return 0;

    const currentAllocations = operatorStreams[streamId]?.allocations ?? {};
    const allocatedToOthers = Object.entries(currentAllocations).reduce(
      (total, [id, value]) => id === counterPartyId ? total : total + Number(value ?? 0),
      0
    );

    return Math.max(0, getCapacityValue(stream.source) - allocatedToOthers);
  };

  const updateGraph = (
    reload?: boolean,
    terminalValues: typeof terminals = terminals,
    allocationValues: typeof operatorStreams = operatorStreams,
    tradeValues: TradeProps[] = trades
  ) => {
    const nodes = terminalValues;

    const getAllocationValue = (streamId: string) => {
      const allocations = allocationValues[streamId]?.allocations;
      if (!allocations) return 0;

      if (tab === 'shipper') {
        return Number(allocations[shipper] ?? 0);
      }

      return Object.values(allocations)
        .reduce((total, value) => total + Number(value ?? 0), 0);
    };

    const nominations = streams.map((stream) => {
      const nomination = {
        ltype: 'nomination',
        ...stream,
        value: 0,
        color: '#0074D9',
        overload: 0
      } as any;

      tradeValues.forEach((trade) => {
        if (trade.stream && trade.stream.id === stream.id) {
          nomination.value += parseInt(trade.volume);
        }
      });

      const allocationValue = getAllocationValue(stream.id);
      const capacity = getCapacityValue(stream.source, terminalValues);

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
      const capacity = getCapacityValue(stream.source, terminalValues);

      if (allocationValue >= nomination.value) {
        allocationValue -= nomination.value;
      }

      const allocation = {
        ...stream,
        value: allocationValue,
        id: `${stream.id}-allocation`,
        name: `${stream.name} Allocation`,
        color: '#FFDC00',
        overload: 0
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
      const capacity = getCapacityValue(stream.source, terminalValues);

      if (capacity - (nomination.value + allocationValue) < 0) {
        spareValue = 0;
      } else {
        spareValue = capacity - allocationValue;
      }
      // console.log('SPARE', stream.name, 'alloc', allocationValue, 'nom', nomination.value, 'spare', spareValue, 'capacity', capacity);

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
    graphContainer?.setAttribute('data-init', JSON.stringify(graphData));

    if (reload) {
      graphContainer?.setAttribute('data-reload', `${new Date().getTime()}`);
    }
  }

  const updateOperatorStreams = (tradeValues: TradeProps[] = trades) => {
    const operatorStreamsForUpdate = { ...operatorStreams };
    streams.forEach((stream) => {
      const nomination = tradeValues.reduce((total, trade) => {
        if (trade.stream && trade.stream.id === stream.id) {
          return total + Number(trade.volume);
        }
        return total;
      }, 0);

      if (operatorStreamsForUpdate[stream.id]) {
        operatorStreamsForUpdate[stream.id] = {
          ...operatorStreamsForUpdate[stream.id],
          nomination,
        };
      }
    });
    setOperatorStreams(operatorStreamsForUpdate);
    return operatorStreamsForUpdate;
  }

  const getStreamById = (id: any) => streams.find(stream => stream.id === id);

  const getCounterPartyById = (id: any) => counterParties.find(cp => cp.id === id);

  const editTradeAction = async (trade: TradeProps) => {
    await setIsEditing(true);
    await setEditTrade(trade);
  }

  const deleteTrade = async (tradeId: number) => {
    console.log('Trade Deleted', tradeId);
    const deletedTrades = trades.filter(trade => trade.id !== tradeId);
    console.log('deleted trades', deletedTrades);

    setTrades(deletedTrades);
    await setIsEditing(false);

    const nextOperatorStreams = updateOperatorStreams(deletedTrades);
    updateGraph(false, terminals, nextOperatorStreams, deletedTrades);
  }

  const handleTrade = async (e: IFormInput) => {
    const stream = getStreamById(e.stream);
    const counterparty = getCounterPartyById(e.counterparty);

    const newTrade = {
      ...e,
      stream,
      counterparty,
    };

    let nextTrades: TradeProps[] | any;

    if (isEditing && editTrade) {
      nextTrades = trades.map(trade => trade.id === editTrade.id
        ? { ...newTrade, id: editTrade.id }
        : trade);
    } else {
      const updateTrade = {
        ...newTrade,
        id: new Date().getTime()
      } as any

      nextTrades = [...trades, updateTrade];
    }

    setTrades(nextTrades);
    await setIsEditing(false);
    setEditTrade(null);

    const nextOperatorStreams = updateOperatorStreams(nextTrades);
    updateGraph(false, terminals, nextOperatorStreams, nextTrades);
  }

  const handleTerminalCapacityChange = (e: any, terminalId: number) => {
    e.preventDefault();
    const terminalsForChange = [...terminals];
    const terminalIndex = terminalsForChange.findIndex(terminal => terminal.id === terminalId);
    if (terminalIndex === -1) return;

    terminalsForChange[terminalIndex] = {
      ...terminalsForChange[terminalIndex],
      totalCapacity: Number(e.target.value)
    };

    const propagatedTerminals = propagateTerminalCapacity(terminalsForChange, terminalId);
    setTerminals(propagatedTerminals);
    updateGraph(true, propagatedTerminals);
  }

  const handleOperatorFormChange = (e: React.ChangeEvent<HTMLInputElement>, streamId: string, counterPartyId: string) => {
    const value = e.currentTarget.value === '' ? 0 : Number(e.currentTarget.value);
   
    const nextOperatorStreams = {
      ...operatorStreams,
      [streamId]: {
        ...operatorStreams[streamId],
        allocations: {
          ...operatorStreams[streamId].allocations,
          [counterPartyId]: value,
        },
      },
    };
    setOperatorStreams(nextOperatorStreams);
    updateGraph(false, terminals, nextOperatorStreams);
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
      } as any;

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
                    <li className={tab === 'shipper' ? 'is-active' : ''}>
                      <a onClick={() => { handleTabSwitch('shipper'); }}>Supplier</a>
                    </li>
                    <li className={tab === 'operator' ? 'is-active' : ''}>
                      <a onClick={() => { handleTabSwitch('operator'); }}>Operator</a>
                    </li>
                  </ul>
                </div>
                {tab === 'shipper' && (
                  <TradeForm 
                    counterParties={counterParties}
                    deleteTrade={deleteTrade}
                    editTradeAction={editTradeAction}
                    handleTrade={handleTrade}
                    isEditing={isEditing}
                    streams={streams}
                    trades={trades}
                  />
                )}
                {tab === 'operator' && (
                  <StreamForm 
                    counterParties={counterParties}
                    getRemainingAllocationCapacity={getRemainingAllocationCapacity}
                    handleOperatorFormChange={handleOperatorFormChange}
                    operatorStreams={operatorStreams}
                  />
                )}
              </div>
            </div>
            <div className="column is-4">
              <div className="box">
                <div className="tabs">
                  <ul>
                    <li className={ctab === 'terminal' ? 'is-active' : ''}>
                      <a onClick={() => { handleConfigTabSwitch('terminal'); }}>Terminals</a>
                    </li>
                    <li className={ctab === 'config' ? 'is-active' : ''}>
                      <a onClick={() => { handleConfigTabSwitch('config'); }}>Configs</a>
                    </li>
                  </ul>
                </div>
                {ctab === 'terminal' && (
                  <TerminalMenu 
                    handleTerminalCapacityChange={handleTerminalCapacityChange}
                    terminals={terminals}
                  />
                )}
                {ctab === 'config' && (
                  <Config 
                    updateGraph={updateGraph}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  )
}

export default App;