import {useDiscoverQuery} from 'sentry/utils/discover/discoverQuery';
import EventView from 'sentry/utils/discover/eventView';
import {Sort} from 'sentry/utils/discover/fields';
import {DiscoverDatasets} from 'sentry/utils/discover/types';
import {useLocation} from 'sentry/utils/useLocation';
import useOrganization from 'sentry/utils/useOrganization';
import usePageFilters from 'sentry/utils/usePageFilters';
import {calculatePerformanceScore} from 'sentry/views/performance/browser/webVitals/utils/queries/rawWebVitalsQueries/calculatePerformanceScore';
import {RowWithScore} from 'sentry/views/performance/browser/webVitals/utils/types';
import {useWebVitalsSort} from 'sentry/views/performance/browser/webVitals/utils/useWebVitalsSort';

type Props = {
  defaultSort?: Sort;
  enabled?: boolean;
  limit?: number;
  sortName?: string;
  transaction?: string | null;
};

export const useTransactionRawWebVitalsQuery = ({
  limit,
  transaction,
  defaultSort,
  sortName = 'sort',
  enabled = true,
}: Props) => {
  const organization = useOrganization();
  const pageFilters = usePageFilters();
  const location = useLocation();

  const sort = useWebVitalsSort({sortName, defaultSort});

  const eventView = EventView.fromNewQueryWithPageFilters(
    {
      fields: [
        'transaction',
        'transaction.op',
        'p75(measurements.lcp)',
        'p75(measurements.fcp)',
        'p75(measurements.cls)',
        'p75(measurements.ttfb)',
        'p75(measurements.fid)',
        'count()',
      ],
      name: 'Web Vitals',
      query:
        'transaction.op:pageload' + (transaction ? ` transaction:"${transaction}"` : ''),
      version: 2,
      dataset: DiscoverDatasets.METRICS,
    },
    pageFilters.selection
  );

  eventView.sorts = [sort];

  const {data, isLoading, ...rest} = useDiscoverQuery({
    eventView,
    limit: limit ?? 50,
    location,
    orgSlug: organization.slug,
    options: {
      enabled,
      refetchOnWindowFocus: false,
    },
    referrer: 'api.performance.browser.web-vitals.transactions',
  });

  const tableData: RowWithScore[] =
    !isLoading && data?.data.length
      ? data.data
          .map(row => ({
            transaction: row.transaction?.toString(),
            'transaction.op': row['transaction.op']?.toString(),
            'p75(measurements.lcp)': row['p75(measurements.lcp)'] as number,
            'p75(measurements.fcp)': row['p75(measurements.fcp)'] as number,
            'p75(measurements.cls)': row['p75(measurements.cls)'] as number,
            'p75(measurements.ttfb)': row['p75(measurements.ttfb)'] as number,
            'p75(measurements.fid)': row['p75(measurements.fid)'] as number,
            'count()': row['count()'] as number,
          }))
          .map(row => {
            const {totalScore, clsScore, fcpScore, lcpScore, ttfbScore, fidScore} =
              calculatePerformanceScore({
                lcp: row['p75(measurements.lcp)'],
                fcp: row['p75(measurements.fcp)'],
                cls: row['p75(measurements.cls)'],
                ttfb: row['p75(measurements.ttfb)'],
                fid: row['p75(measurements.fid)'],
              });
            return {
              ...row,
              score: totalScore ?? 0,
              clsScore: clsScore ?? 0,
              fcpScore: fcpScore ?? 0,
              lcpScore: lcpScore ?? 0,
              ttfbScore: ttfbScore ?? 0,
              fidScore: fidScore ?? 0,
            };
          })
      : [];

  return {
    data: tableData,
    isLoading,
    ...rest,
  };
};
