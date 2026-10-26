const visualisationContainer = '#visualisation-container';

const configSankey = {
  margin: {
    top: 40, left: 40, right: 40, bottom: 40,
  },
  nodes: {
    dynamicSizeFontNode: {
      enabled: false,
      minSize: 16,
      maxSize: 20,
    },
    draggableX: true,
    draggableY: true,
    colors: d3.scaleOrdinal(d3.schemeCategory10),
  },
  links: {
    formatValue(val) {
      return `${d3.format(',.0f')(val)} Units`;
    },
  },
  tooltip: {
    infoDiv: true,
    labelSource: 'Input:',
    labelTarget: 'Output:',
  },
};

const targetNode = document.querySelector(visualisationContainer);
let objSankey;

const initializeSankey = () => {
  if (objSankey) return;

  const bounds = targetNode.getBoundingClientRect();
  const minimumHeight = configSankey.margin.top + configSankey.margin.bottom;
  if (bounds.width <= configSankey.margin.left + configSankey.margin.right
    || bounds.height <= minimumHeight) {
    return;
  }

  const graphData = JSON.parse(targetNode.getAttribute('data-init'));
  objSankey = sk.createSankey(visualisationContainer, configSankey, graphData);
  resizeObserver.disconnect();
};

const resizeObserver = new ResizeObserver(initializeSankey);
resizeObserver.observe(targetNode);
initializeSankey();

// Options for the observer (which mutations to observe)
const config = { attributes: true, childList: false, subtree: false };

// Callback function to execute when mutations are observed
const callback = function (mutationsList) {
  for (const mutation of mutationsList) {
    if (mutation.type === 'attributes') {
      switch (mutation.attributeName) {
        case 'data-init':
          if (objSankey) {
            const graphData = JSON.parse(targetNode.getAttribute(mutation.attributeName));
            objSankey.updateData(graphData);
          } else {
            initializeSankey();
          }
          break;
        case 'data-reload':
          if (objSankey) {
            const graphData = JSON.parse(targetNode.getAttribute('data-init'));
            objSankey = sk.createSankey(visualisationContainer, configSankey, graphData);
          } else {
            initializeSankey();
          }
          break;
        default:
      }
    }
  }
};

// Create an observer instance linked to the callback function
const observer = new MutationObserver(callback);

// Start observing the target node for configured mutations
observer.observe(targetNode, config);
