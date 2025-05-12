import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  TextField, 
  Typography, 
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { styled } from '@mui/material/styles';

const SearchContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
}));

const SearchBox = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(3),
}));

const ResultsList = styled(Paper)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

interface SearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
}

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      const data = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Search failed:', error);
      // TODO: Add error handling UI
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <SearchContainer maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom align="center">
        AI 语义搜索
      </Typography>
      
      <SearchBox elevation={3}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="输入搜索内容..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  onClick={handleSearch}
                  disabled={loading}
                  edge="end"
                >
                  {loading ? <CircularProgress size={24} /> : <SearchIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </SearchBox>

      {results.length > 0 && (
        <ResultsList elevation={2}>
          <List>
            {results.map((result) => (
              <ListItem key={result.id} divider>
                <ListItemText
                  primary={result.title}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        {result.content}
                      </Typography>
                      <br />
                      <Typography component="span" variant="caption" color="text.secondary">
                        相关度: {(result.similarity * 100).toFixed(1)}%
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </ResultsList>
      )}
    </SearchContainer>
  );
}

export default App; 