const counterParties = [
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

const streams = [
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

const defaultTerminalValues = [
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
];

export {
    counterParties,
    defaultTerminalValues,
    streams
}