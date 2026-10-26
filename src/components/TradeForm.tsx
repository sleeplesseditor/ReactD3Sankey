import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { getTodayDateString, tradeFormSchema } from '@helpers/tradeFormSchema';
import type { InferType } from 'yup';

type TradeFormValues = InferType<typeof tradeFormSchema>;

interface TradeFormProps {
    counterParties: any;
    deleteTrade: (id: number) => void;
    editTradeAction: (trade: any) => void;
    isEditing: boolean;
    handleTrade: (values: TradeFormValues) => Promise<void>;
    streams: any;
    trades: any;
}

const TradeForm = ({ counterParties, deleteTrade, editTradeAction, handleTrade, isEditing, streams, trades }: TradeFormProps) => {
    const { register, handleSubmit, reset, formState: { errors } } = useForm<TradeFormValues>({
        defaultValues: {
            month: '',
            volume: '',
            stream: '',
            counterparty: '',
        },
        resolver: yupResolver(tradeFormSchema),
    });

    const onSubmit = async (values: TradeFormValues) => {
        await handleTrade(values);
        reset();
    };

    return (
        <div className="tab-content-shipper">
            <h1 className="box__heading">Trade History</h1>
            <form onSubmit={handleSubmit(onSubmit)}>
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
                        {trades.map((trade: any) => (
                          <tr key={trade?.id}>
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
                                    type="button"
                                  >
                                      Edit
                                  </button>
                                </p>
                                <p className="control">
                                  <button 
                                    className="button is-danger is-small" 
                                    name="delete-button" 
                                    onClick={() => { deleteTrade(trade.id); }} 
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
                                className={`input is-fullwidth ${Object.keys(errors).includes("month") ? "error-input" : ""}` }
                                min={getTodayDateString()}
                                type="date" 
                                {...register("month")}
                            />
                          </td>
                          <td>
                            <input 
                                className={`input is-fullwidth ${Object.keys(errors).includes("volume") ? "error-input" : ""}`}
                                step="100" 
                                type="number"
                                {...(register('volume'))}
                            />
                          </td>
                          <td>
                            <div className={`select is-fullwidth ${errors.stream ? "error-input" : ""}`}>
                              <select
                                aria-describedby={errors.stream ? "stream-error" : undefined}
                                aria-invalid={Boolean(errors.stream)}
                                {...register("stream")}
                              >
                                <option value="">Select Stream</option>
                                {streams.map((stream: any) => (
                                  <option value={stream.id} key={stream.id}>{stream.name}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td colSpan="2">
                            <div className={`select is-fullwidth ${errors.counterparty ? "error-input" : ""}`}>
                                <select
                                    aria-describedby={errors.counterparty ? "counterparty-error" : undefined}
                                    aria-invalid={Boolean(errors.counterparty)}
                                    {...register("counterparty")}
                                >
                                    <option value="">Select Counterparty</option>
                                    {counterParties.map((cp: any) => (
                                        <option value={cp.id} key={cp.id}>{cp.name}</option>
                                    ))}
                                </select>
                            </div>
                          </td>
                          <td />
                        </tr>
                    </tbody>
                </table>
                {Object.keys(errors).length > 0 ? (
                    <div className="error-container">
                        {Object.keys(errors).map((error: string) => {
                            return (
                                <span key={error}>{errors[error].message}</span>
                            )
                        })}
                    </div>
                ) : null}
                <button 
                      className={`button ${isEditing ? 'is-warning' : 'is-primary'}`} 
                      name="submit-button" 
                      type="submit" 
                    >
                      {isEditing ? 'Edit Trade' : 'Save Trade'}
                </button>
            </form>
        </div>
    )
}

export default TradeForm;