interface TerminalsProps {
    handleTerminalCapacityChange: (e: any, terminalId: number) => void;
    terminals: { id: number; name: string; totalCapacity: number; color: string; }[]
}

const TerminalMenu = ({ handleTerminalCapacityChange, terminals }: TerminalsProps) => {
    return (
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
                                min={terminal.name === 'Node 1' ? 100 : 0}
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
    )
}

export default TerminalMenu;