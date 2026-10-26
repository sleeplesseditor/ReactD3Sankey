import * as yup from 'yup';

const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const tradeFormSchema = yup.object({
    month: yup.string()
        .required("You must select a valid date for the trade")
        .test(
            'not-in-the-past',
            'The trade date cannot be in the past',
            value => {
                if (!value) return true;

                const date = new Date(`${value}T00:00:00.000Z`);
                return !Number.isNaN(date.getTime())
                    && date.toISOString().slice(0, 10) === value
                    && value >= getTodayDateString();
            }
        ),
    volume: yup.string().required("You must set a volume for the trade"),
    stream: yup.string().required('You must select a stream for the trade'),
    counterparty: yup.string().required("You must select a counterparty for the trade"),
});

export {
    getTodayDateString,
    tradeFormSchema
}