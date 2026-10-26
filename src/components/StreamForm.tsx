interface StreamFormProps {
    counterParties: any[];
    getRemainingAllocationCapacity: any;
    handleOperatorFormChange: any;
    operatorStreams: any;
}

const StreamForm = ({ counterParties, getRemainingAllocationCapacity, handleOperatorFormChange, operatorStreams }: StreamFormProps) => {
    return (
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
                                {counterParties.map(cp => {
                                    const allocationKey = `${operatorStreamId}-${cp.id}`;
                                    const remainingCapacity = getRemainingAllocationCapacity(operatorStreamId, cp.id);
                                    
                                    return (
                                        <td key={allocationKey}>
                                        <input
                                            className="input is-fullwidth"
                                            max={remainingCapacity}
                                            min="0"
                                            name="allocation"
                                            onChange={(e) => { handleOperatorFormChange(e, operatorStream.id, cp.id); }}
                                            step="100"
                                            type="number"
                                        />
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </form>
        </div>
    )
}

export default StreamForm;