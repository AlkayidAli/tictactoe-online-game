<script lang="ts">
  import "../app.css";

  let { children } = $props();
</script>

<svelte:head>
  <title>Tic-Tac-Toe Online</title>
  <meta name="description" content="Distributed Tic-Tac-Toe Game" />
</svelte:head>

{@render children()}
