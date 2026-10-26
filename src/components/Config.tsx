interface IProps {
    updateGraph: (check: boolean) => void;
}

const Config = ({ updateGraph }: IProps) => {
    return (
        <div>
            <h1 className="box__heading">Configure Settings</h1>
            <div className="field is-grouped">
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