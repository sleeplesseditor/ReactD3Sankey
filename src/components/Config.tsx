interface IProps {
    configs: any,
    handleFlowDirection: (event: any) => void;
    updateGraph: (check: boolean) => void;
}

const Config = ({ configs, handleFlowDirection, updateGraph }: IProps) => {
    return (
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
                <button 
                    className="button is-info" 
                    onClick={() => { updateGraph(true); }}
                >
                    Reload Graph
                </button>
                </p>
            </div>
        </div>
    )
}

export default Config;