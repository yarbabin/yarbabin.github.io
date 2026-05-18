import { useParams } from 'react-router-dom';
import CupScoreboard from '../components/CupScoreboard';

export default function CupPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) return null;

  return (
    <div>
      <CupScoreboard cupId={id} />
    </div>
  );
}